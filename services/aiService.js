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
 * @param {function} onComplete - 流式传输完成后的回调函数 (content) => {}
 * @param {function} onAllComplete - 所有处理（包括图片生成）完成后的回调函数 () => {}
 * @param {boolean} waitForComplete - 是否等待onComplete执行完成后再发送完成信号（默认：false，保持向后兼容）
 */
async function callAIStream(prompt, systemPrompt = '', res, retryCount = 0, modelConfig = null, onComplete = null, onAllComplete = null, waitForComplete = false) {
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
    response.data.on('data', async (chunk) => {
      const chunkStr = chunk.toString();
      const lines = chunkStr.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6); // 移除 "data: " 前缀

          if (data === '[DONE]') {
            console.log('[AI Service] 收到[DONE]信号，fullContent长度:', fullContent.length);

            // 如果需要等待onComplete执行完成（用于确保消息已保存到数据库）
            if (waitForComplete && onComplete && fullContent) {
              console.log('[AI Service] 调用onComplete回调（等待完成）');
              try {
                await onComplete(fullContent);
                console.log('[AI Service] onComplete回调执行成功');
              } catch (error) {
                console.error('onComplete回调执行失败:', error.message);
              }
            }

            // 流式结束 - 发送完成信号给前端
            console.log('[AI Service] 发送完成信号给前端');
            res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
            res.end(() => {
              console.log('[AI Service] res.end() 回调执行，流已关闭');
            });

            // 如果不需要等待，异步调用onComplete处理消息和图片生成（不阻塞响应）
            if (!waitForComplete && onComplete && fullContent) {
              console.log('[AI Service] 异步调用onComplete回调');
              try {
                await onComplete(fullContent);
                console.log('[AI Service] onComplete回调执行成功');
              } catch (error) {
                console.error('onComplete回调执行失败:', error.message);
              }
            }

            // 调用onAllComplete回调（如果提供）
            if (onAllComplete) {
              try {
                onAllComplete();
              } catch (error) {
                console.error('onAllComplete回调执行失败:', error.message);
              }
            }
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
    response.data.on('end', async () => {
      console.log('[AI Service] [end事件] 触发，res.headersSent:', res.headersSent);
      // 如果没有收到[DONE]信号，发送完成信号
      if (!res.headersSent) {
        console.log('[AI Service] [end事件] 发送完成信号给前端');
        res.write(`data: ${JSON.stringify({ done: true, content: fullContent })}\n\n`);
        res.end(() => {
          console.log('[AI Service] [end事件] res.end() 回调执行，流已关闭');
        });

        // 然后异步调用onComplete处理消息和图片生成（不阻塞响应）
        if (onComplete && fullContent) {
          console.log('[AI Service] [end事件] 调用onComplete回调');
          try {
            await onComplete(fullContent);
            console.log('[AI Service] [end事件] onComplete回调执行成功');
          } catch (error) {
            console.error('[AI Service] [end事件] onComplete回调执行失败:', error.message);
          }
        }
        // 调用onAllComplete回调（如果提供）
        if (onAllComplete) {
          try {
            onAllComplete();
          } catch (error) {
            console.error('[AI Service] [end事件] onAllComplete回调执行失败:', error.message);
          }
        }
      }
    });

    // 监听错误事件
    response.data.on('error', (error) => {
      console.error('Stream error:', error);
      if (!res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: '流式传输错误', errorCode: 'STREAM_ERROR' })}\n\n`);
        res.end();
      }
    });

  } catch (error) {
    // 检查是否是429错误（请求过多）- 使用重试机制
    if (error.response?.status === 429 && retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount); // 指数退避：2s, 4s, 8s

      console.warn(`429错误：请求过多，${delay/1000}秒后重试... (第${retryCount + 1}次重试)`);

      // 等待指定时间
      await new Promise(resolve => setTimeout(resolve, delay));

      // 递归重试
      return callAIStream(prompt, systemPrompt, res, retryCount + 1, modelConfig, onComplete, onAllComplete, waitForComplete);
    }

    // 其他错误或重试次数用完
    console.error('AI Stream API Error:', error.response?.data || error.message);

    // 获取错误码
    const statusCode = error.response?.status;
    const errorCode = getErrorCode(statusCode);

    if (!res.headersSent) {
      let errorMessage = 'AI服务调用失败';

      if (statusCode === 429) {
        errorMessage = '请求过于频繁，请稍后再试';
      } else if (statusCode === 400) {
        errorMessage = '请求参数错误，请检查输入';
      } else if (statusCode === 401) {
        errorMessage = 'API密钥无效或已过期';
      } else if (statusCode === 403) {
        errorMessage = '无权访问此AI模型';
      } else if (statusCode === 421) {
        errorMessage = 'API端点配置错误';
      } else if (statusCode === 500) {
        errorMessage = 'AI服务内部错误';
      } else if (statusCode === 503) {
        errorMessage = 'AI服务暂时不可用';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = '请求超时';
      }

      res.write(`data: ${JSON.stringify({
        error: errorMessage,
        errorCode: errorCode,
        statusCode: statusCode
      })}\n\n`);
      res.end();
    }
  }
}

/**
 * 根据HTTP状态码获取错误码
 * @param {number} statusCode - HTTP状态码
 * @returns {string} 错误码
 */
function getErrorCode(statusCode) {
  if (!statusCode) return 'UNKNOWN_ERROR';

  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 421:
      return 'MISDIRECTED_REQUEST';
    case 429:
      return 'RATE_LIMITED';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'UNKNOWN_ERROR';
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
