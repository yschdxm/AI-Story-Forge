const axios = require('axios');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../middleware/auth');

/**
 * AI服务核心函数 - 非流式（带429错误自动重试）
 * 支持自定义模型配置
 * @param {string} prompt - 用户提示词
 * @param {string} systemPrompt - 系统提示词
 * @param {number} retryCount - 当前重试次数
 * @param {object} modelConfig - 模型配置 { url, apiKey, modelId }
 * @returns {Promise<string>} AI响应内容
 */

/**
 * AI服务核心函数 - 流式（带429错误自动重试）
 * 支持自定义模型配置
 * @param {string} prompt - 用户提示词
 * @param {string} systemPrompt - 系统提示词
 * @param {object} res - Express响应对象
 * @param {number} retryCount - 当前重试次数
 * @param {object} modelConfig - 模型配置 { url, apiKey, modelId }
 */
async function callAIStream(prompt, systemPrompt = '', res, retryCount = 0, modelConfig = null) {
  const maxRetries = 3; // 最大重试次数
  const baseDelay = 2000; // 基础延迟2秒

  // 使用传入的模型配置或默认配置
  const config = modelConfig;

  try {
    const response = await axios.post(
      config.url,
      {
        model: config.modelId || config.model,
        messages: [
          ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
          { role: 'user', content: prompt }
        ],
        temperature: 0.8,
        stream: true
      },
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        responseType: 'stream'
      }
    );

    // 设置响应头为流式
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // 禁用Nginx缓冲

    let fullContent = '';

    // 监听数据流
    response.data.on('data', (chunk) => {
      const chunkStr = chunk.toString();
      const lines = chunkStr.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // 移除 "data: " 前缀

          if (data === '[DONE]') {
            // 流式结束
            res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
            res.end();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;

            if (content) {
              fullContent += content;
              // 发送内容片段到前端
              res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
            }
          } catch (e) {
            // 忽略解析错误
          }
        }
      }
    });

    // 监听结束事件
    response.data.on('end', () => {
      if (!res.headersSent) {
        res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
        res.end();
      }
    });

    // 监听错误事件
    response.data.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: '流式传输错误' })}\n\n`);
        res.end();
      }
    });

  } catch (error) {
    // 检查是否是429错误（请求过多）
    if (error.response?.status === 429 && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount); // 指数退避：2s, 4s, 8s

      console.warn(`429错误：请求过多，${delay/1000}秒后重试... (第${retryCount + 1}次重试)`);

      // 等待指定时间
      await new Promise(resolve => setTimeout(resolve, delay));

      // 递归重试
      return callAIStream(prompt, systemPrompt, res, retryCount + 1, config);
    }

    // 其他错误或重试次数用完
    console.error('AI Stream API Error:', error.response?.data || error.message);

    if (!res.headersSent) {
      if (error.response?.status === 429) {
        res.json({ success: false, error: '请求过于频繁，请稍后再试' });
      } else if (error.code === 'ECONNABORTED') {
        res.json({ success: false, error: '请求超时' });
      } else {
        res.json({ success: false, error: 'AI服务调用失败' });
      }
    }
  }
}

/**
 * 从请求头或body中获取模型配置
 * @param {object} req - Express请求对象
 * @returns {Promise<object|null>} 模型配置或null
 */
async function getModelConfigFromRequest(req) {
  try {
    // 1. 尝试从请求体中获取模型配置
    if (req.body && req.body.modelConfig) {
      return req.body.modelConfig;
    }

    // 2. 尝试从请求头获取模型配置
    const modelConfigHeader = req.headers['x-model-config'];
    if (modelConfigHeader) {
      return JSON.parse(modelConfigHeader);
    }

    // 3. 尝试从用户数据库中的 selectedModel 获取（通过token）
    // 所有存储必须在服务器端进行
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (user && user.selectedModel) {
        return user.selectedModel;
      }
    }

    // 4. 返回 null（没有找到模型配置）
    return null;
  } catch (error) {
    console.warn('获取模型配置失败:', error.message);
    return null;
  }
}

module.exports = {
  callAIStream,
  getModelConfigFromRequest
};
