const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const History = require('../models/History');
const Story = require('../models/Story');
const { callAIStream, getModelConfigFromRequest } = require('../services/aiService');
const { authenticateToken } = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'ai-story-forge-secret-key-change-in-production';

/**
 * 从JWT获取用户ID
 */
function getUserIdFromToken(authHeader) {
  if (!authHeader) return null;
  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    return null;
  }
}

/**
 * POST /api/story/create
 * 创建故事
 */
router.post('/create', authenticateToken, async (req, res) => {
  try {
    const { name, characters, plot, world } = req.body;

    // 验证必填字段
    if (!name || !characters || !plot || !world) {
      return res.status(400).json({ success: false, error: '缺少必要字段' });
    }

    // 验证角色数量
    if (characters.length > 4) {
      return res.status(400).json({ success: false, error: '角色数量不能超过4个' });
    }

    // 验证主角数量（必须且只能1个）
    const mainCharacterCount = characters.filter(c => c.role === '主角').length;
    if (mainCharacterCount !== 1) {
      return res.status(400).json({ success: false, error: '必须且只能有1个主角' });
    }

    // 验证角色不重复
    const historyIds = characters.map(c => c.historyId);
    if (new Set(historyIds).size !== historyIds.length) {
      return res.status(400).json({ success: false, error: '角色不能重复' });
    }

    // 获取历史记录数据
    const [plotHistory, worldHistory] = await Promise.all([
      History.findById(plot.historyId),
      History.findById(world.historyId)
    ]);

    if (!plotHistory || !worldHistory) {
      return res.status(400).json({ success: false, error: '历史记录不存在' });
    }

    // 处理角色数据
    const characterData = await Promise.all(
      characters.map(async (char) => {
        const history = await History.findById(char.historyId);
        if (!history) {
          throw new Error(`角色历史记录不存在: ${char.historyId}`);
        }

        return {
          role: char.role,
          historyId: char.historyId,
          name: history.inputParams?.archetype || '未命名',
          archetype: history.inputParams?.archetype,
          setting: history.inputParams?.setting,
          traits: history.inputParams?.traits
        };
      })
    );

    // 创建故事
    const story = new Story({
      userId: req.user._id,
      name,
      characters: characterData,
      plot: {
        historyId: plot.historyId,
        keywords: plotHistory.inputParams?.keywords,
        genre: plotHistory.inputParams?.genre,
        complexity: plotHistory.inputParams?.complexity
      },
      world: {
        historyId: world.historyId,
        era: worldHistory.inputParams?.era,
        technology: worldHistory.inputParams?.technology,
        magicSystem: worldHistory.inputParams?.magicSystem,
        culture: worldHistory.inputParams?.culture
      },
      messages: [],
      memories: [],
      parseErrorCount: 0,
      status: 'active',
      metadata: {
        totalMessages: 0
      }
    });

    await story.save();

    res.status(201).json({
      success: true,
      story: {
        id: story._id,
        name: story.name,
        characters: story.characters,
        plot: story.plot,
        world: story.world
      }
    });

  } catch (error) {
    console.error('创建故事错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/story/list
 * 获取故事列表
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [stories, total] = await Promise.all([
      Story.find({ userId: req.user._id, status: 'active' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Story.countDocuments({ userId: req.user._id, status: 'active' })
    ]);

    const formattedStories = stories.map(story => ({
      id: story._id,
      name: story.name,
      characters: story.characters,
      plot: story.plot,
      world: story.world,
      lastMessageAt: story.metadata?.lastMessageAt,
      totalMessages: story.metadata?.totalMessages || 0,
      createdAt: story.createdAt
    }));

    res.json({
      success: true,
      stories: formattedStories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取故事列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/story/:id
 * 获取故事详情
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!story) {
      return res.status(404).json({ success: false, error: '故事不存在' });
    }

    res.json({
      success: true,
      story: {
        id: story._id,
        name: story.name,
        characters: story.characters,
        plot: story.plot,
        world: story.world,
        messages: story.messages,
        memories: story.memories,
        parseErrorCount: story.parseErrorCount
      }
    });

  } catch (error) {
    console.error('获取故事详情错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/story/:id
 * 删除故事
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!story) {
      return res.status(404).json({ success: false, error: '故事不存在' });
    }

    res.json({
      success: true,
      message: '故事已删除'
    });

  } catch (error) {
    console.error('删除故事错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/story
 * 删除所有故事
 */
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const result = await Story.deleteMany({ userId: req.user._id });

    res.json({
      success: true,
      message: `已删除 ${result.deletedCount} 个故事`
    });

  } catch (error) {
    console.error('删除所有故事错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 辅助函数：构建系统提示词
 */
function buildSystemPrompt(story) {
  let prompt = '你正在演绎一个故事。请严格遵循以下背景设定：\n\n';

  // 世界观
  prompt += '## 🌍 世界观\n';
  prompt += `时代背景：${story.world.era || '未知'}\n`;
  prompt += `科技水平：${story.world.technology || '未知'}\n`;
  prompt += `魔法体系：${story.world.magicSystem || '无'}\n`;
  prompt += `文化背景：${story.world.culture || '未知'}\n\n`;

  // 情节
  prompt += '## 📖 故事情节\n';
  prompt += `关键词：${story.plot.keywords || '未知'}\n`;
  prompt += `类型：${story.plot.genre || '未知'}\n`;
  prompt += `复杂度：${story.plot.complexity || '未知'}\n\n`;

  // 角色
  prompt += '## 🎭 角色设定\n';
  story.characters.forEach((char, index) => {
    prompt += `${index + 1}. ${char.role}（${char.name || '未命名'}）\n`;
    if (char.archetype) prompt += `   原型：${char.archetype}\n`;
    if (char.setting) prompt += `   背景：${char.setting}\n`;
    if (char.traits) prompt += `   特质：${char.traits}\n`;
  });
  prompt += '\n';

  // 记忆
  if (story.memories && story.memories.length > 0) {
    prompt += '## 💾 记忆\n';
    story.memories.slice(-3).forEach((mem, i) => {
      prompt += `记忆${i + 1}: ${mem.summary}\n`;
    });
    prompt += '\n';
  }

  // 对话历史
  if (story.messages && story.messages.length > 0) {
    prompt += '## 💬 对话历史\n';
    const recentMessages = story.messages.slice(-50);
    recentMessages.forEach(msg => {
      const role = msg.type === '记忆' ? '系统' : msg.type;
      const charName = msg.characterId !== undefined ? story.characters[msg.characterId]?.name : '';
      const prefix = charName ? `${role}(${charName})` : role;
      prompt += `${prefix}: ${msg.content}\n`;
    });
    prompt += '\n';
  }

  prompt += '## 📝 演绎规则\n';
  prompt += '1. 严格遵循角色设定，保持角色一致性\n';
  prompt += '2. 根据故事情节发展对话\n';
  prompt += '3. 对话要自然、生动\n';
  prompt += '4. 如果是旁白，请以叙述性语言描述场景\n';
  prompt += '5. 不要跳出角色身份\n';
  prompt += '6. 返回语言为中文\n';

  return prompt;
}

/**
 * 辅助函数：构建用户提示词
 */
function buildUserPrompt(story, messageData) {
  let prompt = '';

  if (messageData.type === '主角') {
    prompt = `主角说：${messageData.content}\n\n请以故事中其他角色的身份进行回应。`;
  } else if (messageData.type === 'NPC') {
    const npc = story.characters[messageData.characterId];
    prompt = `${npc?.name || 'NPC'}说：${messageData.content}\n\n请继续故事，其他角色可以回应。`;
  } else if (messageData.type === '旁白') {
    prompt = `旁白：${messageData.content}\n\n请根据旁白内容，继续故事的发展。`;
  }

  return prompt;
}

/**
 * 辅助函数：保存消息
 */
async function saveMessage(storyId, messageData) {
  const story = await Story.findById(storyId);
  if (!story) return;

  story.messages.push(messageData);
  story.metadata.lastMessageAt = new Date();
  story.metadata.totalMessages = (story.metadata.totalMessages || 0) + 1;

  await story.save();
}

/**
 * 辅助函数：检查并执行记忆压缩
 */
async function checkAndCompressMemory(storyId) {
  const story = await Story.findById(storyId);
  if (!story) return null;

  // 检查是否需要压缩（消息数 >= 50）
  if (story.messages.length < 50) {
    return null;
  }

  // 获取最近50条消息
  const recentMessages = story.messages.slice(-50);

  // 构建记忆压缩提示词
  const systemPrompt = `你是一个故事记忆压缩专家。请将以下对话历史压缩成简洁的记忆摘要。

对话历史：
${JSON.stringify(recentMessages, null, 2)}

请生成一个简洁的记忆摘要，包含：
- 关键情节发展
- 角色关系变化
- 重要事件
- 当前状态

摘要风格类似旁白，但要更简洁、更具概括性。
字数控制在200字以内。`;

  // 调用AI生成记忆摘要
  const modelConfig = await getModelConfigFromRequest({ headers: {} });
  if (!modelConfig) {
    return null;
  }

  try {
    // 使用非流式调用
    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(modelConfig.headers || {})
      },
      body: JSON.stringify({
        model: modelConfig.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '请生成记忆摘要。' }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || data.content || '';

    if (summary) {
      // 保存到 memories
      story.memories.push({
        summary: summary,
        timestamp: new Date()
      });

      // 清空 messages（保留最后5条）
      story.messages = story.messages.slice(-5);

      // 添加记忆消息到 messages
      story.messages.push({
        type: '记忆',
        content: summary,
        timestamp: new Date()
      });

      await story.save();

      return summary;
    }
  } catch (error) {
    console.error('记忆压缩错误:', error);
  }

  return null;
}

/**
 * POST /api/story/:id/message
 * 发送消息（流式）
 */
router.post('/:id/message', authenticateToken, async (req, res) => {
  try {
    const { type, characterId, content } = req.body;

    // 验证必填字段
    if (!type || !content) {
      return res.status(400).json({ success: false, error: '缺少必要字段' });
    }

    // 获取故事
    const story = await Story.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!story) {
      return res.status(404).json({ success: false, error: '故事不存在' });
    }

    // 验证NPC选择
    if (type === 'NPC') {
      if (characterId === undefined || characterId === null) {
        return res.status(400).json({ success: false, error: '请选择NPC' });
      }
      if (characterId < 0 || characterId >= story.characters.length) {
        return res.status(400).json({ success: false, error: '无效的NPC' });
      }
    }

    // 构建提示词
    const systemPrompt = buildSystemPrompt(story);
    const userPrompt = buildUserPrompt(story, { type, characterId, content });

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({
        success: false,
        error: '未找到模型配置，请先选择或配置AI模型'
      });
    }

    // 保存用户消息
    const messageData = {
      type,
      characterId,
      content,
      timestamp: new Date()
    };

    await saveMessage(story._id, messageData);

    // 流式调用AI
    let fullContent = '';

    await callAIStream(
      userPrompt,
      systemPrompt,
      res,
      0,
      modelConfig,
      async (finalContent) => {
        fullContent = finalContent;

        // 保存AI回复
        const aiMessageData = {
          type: type === '旁白' ? '旁白' : 'NPC',
          characterId: type === 'NPC' ? characterId : undefined,
          content: finalContent,
          timestamp: new Date()
        };

        await saveMessage(story._id, aiMessageData);

        // 检查是否需要记忆压缩
        await checkAndCompressMemory(story._id);
      }
    );

  } catch (error) {
    console.error('发送消息错误:', error);
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

module.exports = router;
