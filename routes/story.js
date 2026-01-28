const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
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
 * 生成故事数据（角色、情节、世界观）
 * 带重试机制，最多5次
 */
async function generateStoryData(name, characters, plot, world, plotHistory, worldHistory, modelConfig, retryCount = 0) {
  const maxRetries = 5;

  // 构建系统提示词
  const systemPrompt = buildStoryDataPrompt(name, characters, plot, world, plotHistory, worldHistory);

  // 调用 AI 生成数据
  const response = await axios.post(
    modelConfig.url,
    {
      model: modelConfig.modelId,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: '请生成完整的故事数据，包括角色详细信息、情节和世界观。' }
      ],
      temperature: 0.8,
      max_tokens: 3000
    },
    {
      headers: {
        'Authorization': `Bearer ${modelConfig.apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  const content = response.data.choices?.[0]?.message?.content || response.data.content || '';

  // 解析 AI 响应（JSON格式）
  let responseData = null;
  let parseError = null;

  // 尝试从响应中提取JSON
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      responseData = JSON.parse(jsonMatch[1]);
    } catch (e) {
      parseError = e;
    }
  }

  // 如果没有找到代码块格式，尝试直接解析
  if (!responseData) {
    const braceMatch = content.match(/\{[\s\S]*\}/);
    if (braceMatch) {
      try {
        responseData = JSON.parse(braceMatch[0]);
      } catch (e) {
        parseError = e;
      }
    }
  }

  // 如果解析失败且还有重试次数，重新调用
  if (!responseData && retryCount < maxRetries) {
    console.log(`[Story Data] JSON解析失败，第${retryCount + 1}次重试...`);

    // 等待一段时间后重试
    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));

    // 递归重试
    return generateStoryData(name, characters, plot, world, plotHistory, worldHistory, modelConfig, retryCount + 1);
  }

  // 达到最大重试次数仍然失败
  if (!responseData) {
    throw new Error(`JSON解析失败，已重试${maxRetries}次: ${parseError?.message || '无法解析AI响应'}`);
  }

  return responseData;
}

/**
 * 构建故事数据提示词
 */
function buildStoryDataPrompt(name, characters, plot, world, plotHistory, worldHistory) {
  let prompt = `你正在为一个故事生成完整数据。请严格按照JSON格式返回。

## 故事信息
**故事名称**：${name}

## 角色配置
`;

  characters.forEach((char, index) => {
    const isAuto = !char.historyId;
    const source = isAuto ? '（需要AI生成）' : '（已有历史记录）';
    prompt += `${index + 1}. ${char.role} ${source}\n`;
    if (!isAuto) {
      const history = plotHistory || worldHistory;
      if (history) {
        const charData = history.structuredData?.character || {};
        prompt += `   名称：${charData.name || '未知'}\n`;
      }
    }
    prompt += '\n';
  });

  prompt += `## 情节配置
${!plot.historyId ? '（需要AI生成完整情节）' : '（已有历史记录）'}

## 世界观配置
${!world.historyId ? '（需要AI生成完整世界观）' : '（已有历史记录）'}

## 📝 输出格式
请严格按照以下JSON格式返回：

\`\`\`json
{
  "characters": [
    {
      "name": "角色名称",
      "archetype": "角色原型（如：英雄、反派、导师等）",
      "setting": "角色背景/出身",
      "traits": ["特质1", "特质2", "特质3"],
      "appearance": "外貌描述",
      "personality": "性格描述",
      "backstory": "背景故事",
      "motivation": "动机/目标",
      "abilities": ["能力1", "能力2"],
      "roleInStory": "在故事中的作用"
    }
  ],
  "plot": {
    "title": "情节标题",
    "summary": "情节概要",
    "keywords": ["关键词1", "关键词2", "关键词3"],
    "genre": "故事类型（如：科幻、奇幻、悬疑等）",
    "complexity": "复杂度（如：简单、中等、复杂）",
    "acts": [
      {
        "actNumber": 1,
        "title": "第一幕标题",
        "description": "第一幕描述",
        "keyEvents": ["事件1", "事件2"]
      }
    ],
    "climax": "高潮",
    "resolution": "结局",
    "themes": ["主题1", "主题2"]
  },
  "world": {
    "worldName": "世界名称",
    "era": "时代背景",
    "technology": "科技水平",
    "magicSystem": {
      "name": "魔法体系名称",
      "rules": ["规则1", "规则2"],
      "limitations": ["限制1", "限制2"],
      "source": "魔法来源"
    },
    "culture": "文化背景",
    "geography": "地理环境",
    "politics": "政治制度",
    "economy": "经济体系",
    "religions": ["宗教1", "宗教2"],
    "notableLocations": [
      {
        "name": "地点名称",
        "description": "地点描述"
      }
    ],
    "uniqueFeatures": ["独特特征1", "独特特征2"]
  }
}
\`\`\`

## ⚠️ 重要提示
1. **所有字段都必须填写**，不能为空或null
2. **数组字段**必须是数组格式，即使只有一个元素
3. **角色数据**：为每个自动生成的角色创建完整的详细信息
4. **情节数据**：创建完整的三幕结构
5. **世界观数据**：创建详细的世界设定
6. **返回语言**：中文
7. **必须返回JSON格式**

请开始生成：`;

  return prompt;
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

    // 验证角色不重复（只检查非null的historyId，null表示AI自动生成的角色）
    const historyIds = characters.map(c => c.historyId).filter(id => id !== null);
    if (new Set(historyIds).size !== historyIds.length) {
      return res.status(400).json({ success: false, error: '角色不能重复' });
    }

    // 获取模型配置（在创建故事之前）
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    // 获取历史记录数据（支持自动生成，historyId可能为null）
    const [plotHistory, worldHistory] = await Promise.all([
      plot.historyId ? History.findById(plot.historyId) : null,
      world.historyId ? History.findById(world.historyId) : null
    ]);

    // 验证历史记录（如果提供了historyId，则必须存在）
    if (plot.historyId && !plotHistory) {
      return res.status(400).json({ success: false, error: '故事情节历史记录不存在' });
    }
    if (world.historyId && !worldHistory) {
      return res.status(400).json({ success: false, error: '世界观历史记录不存在' });
    }

    // 检查是否有需要AI生成的内容
    const hasAutoCharacters = characters.some(c => !c.historyId);
    const hasAutoPlot = !plot.historyId;
    const hasAutoWorld = !world.historyId;

    // 如果有自动生成的内容，先调用AI生成完整数据
    let generatedData = null;
    if (hasAutoCharacters || hasAutoPlot || hasAutoWorld) {
      console.log('[Story Create] 检测到自动生成内容，调用AI生成...');
      generatedData = await generateStoryData(
        name,
        characters,
        plot,
        world,
        plotHistory,
        worldHistory,
        modelConfig
      );
      console.log('[Story Create] AI生成完成');
    }

    // 处理角色数据
    const characterData = await Promise.all(
      characters.map(async (char, index) => {
        // 如果是自动生成，使用AI生成的数据
        if (!char.historyId) {
          const generatedChar = generatedData?.characters?.[index];
          return {
            role: char.role,
            historyId: null,
            name: generatedChar?.name || '待AI生成',
            archetype: generatedChar?.archetype,
            setting: generatedChar?.setting,
            traits: generatedChar?.traits || [],
            appearance: generatedChar?.appearance,
            personality: generatedChar?.personality,
            backstory: generatedChar?.backstory,
            motivation: generatedChar?.motivation,
            abilities: generatedChar?.abilities || [],
            roleInStory: generatedChar?.roleInStory
          };
        }

        // 使用已保存的历史记录数据
        const history = await History.findById(char.historyId);
        if (!history) {
          throw new Error(`角色历史记录不存在: ${char.historyId}`);
        }

        const structuredChar = history.structuredData?.character || {};
        const inputParams = history.inputParams || {};

        let traits = structuredChar.traits || inputParams.traits;
        if (traits && !Array.isArray(traits)) {
          traits = [traits];
        }

        let abilities = structuredChar.abilities;
        if (abilities && !Array.isArray(abilities)) {
          abilities = [abilities];
        }

        return {
          role: char.role,
          historyId: char.historyId,
          name: structuredChar.name || inputParams.archetype || '未命名',
          archetype: structuredChar.archetype || inputParams.archetype,
          setting: structuredChar.setting || inputParams.setting,
          traits: traits,
          appearance: structuredChar.appearance,
          personality: structuredChar.personality,
          backstory: structuredChar.backstory,
          motivation: structuredChar.motivation,
          abilities: abilities,
          roleInStory: structuredChar.roleInStory
        };
      })
    );

    // 处理情节数据
    const plotData = generatedData?.plot || plotHistory?.structuredData?.plot || {};
    const plotInputParams = plotHistory?.inputParams || {};

    let keywords = plotData.keywords || plotInputParams.keywords;
    if (keywords && !Array.isArray(keywords)) {
      keywords = [keywords];
    }

    let themes = plotData.themes;
    if (themes && !Array.isArray(themes)) {
      themes = [themes];
    }

    // 处理世界观数据
    const worldData = generatedData?.world || worldHistory?.structuredData?.world || {};
    const worldInputParams = worldHistory?.inputParams || {};

    let religions = worldData.religions;
    if (religions && !Array.isArray(religions)) {
      religions = [religions];
    }

    let uniqueFeatures = worldData.uniqueFeatures;
    if (uniqueFeatures && !Array.isArray(uniqueFeatures)) {
      uniqueFeatures = [uniqueFeatures];
    }

    // 创建故事
    const story = new Story({
      userId: req.user._id,
      name,
      characters: characterData,
      plot: {
        historyId: plot.historyId,
        title: plotData.title,
        summary: plotData.summary,
        keywords: keywords,
        genre: plotData.genre || plotInputParams.genre,
        complexity: plotData.complexity || plotInputParams.complexity,
        acts: plotData.acts,
        climax: plotData.climax,
        resolution: plotData.resolution,
        themes: themes
      },
      world: {
        historyId: world.historyId,
        worldName: worldData.worldName,
        era: worldData.era || worldInputParams.era,
        technology: worldData.technology || worldInputParams.technology,
        magicSystem: worldData.magicSystem || worldInputParams.magicSystem,
        culture: worldData.culture || worldInputParams.culture,
        geography: worldData.geography,
        politics: worldData.politics,
        economy: worldData.economy,
        religions: religions,
        notableLocations: worldData.notableLocations,
        uniqueFeatures: uniqueFeatures
      },
      messages: [],
      memories: [],
      parseErrorCount: 0,
      status: 'active',
      metadata: {
        totalMessages: 0,
        openingGenerating: true  // 标记开场正在生成
      }
    });

    await story.save();

    // 等待故事开场生成完成（带超时）
    try {
      await Promise.race([
        generateStoryOpening(story, modelConfig),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('开场生成超时')), 60000)
        )
      ]);
    } catch (err) {
      console.error('生成故事开场失败:', err);
      // 开场生成失败，删除已创建的故事
      await Story.findByIdAndDelete(story._id);
      throw new Error('故事开场生成失败: ' + err.message);
    }

    // 重新加载故事数据（包含开场消息）
    const savedStory = await Story.findById(story._id);

    res.status(201).json({
      success: true,
      story: {
        id: savedStory._id,
        name: savedStory.name,
        characters: savedStory.characters,
        plot: savedStory.plot,
        world: savedStory.world,
        messages: savedStory.messages,
        metadata: savedStory.metadata
      }
    });

  } catch (error) {
    console.error('创建故事错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * 生成故事开场（旁白介绍 + NPC 首次对话）
 */
async function generateStoryOpening(story, modelConfig) {
  try {
    // 构建系统提示词
    const systemPrompt = buildStoryOpeningPrompt(story);

    // 调用 AI 生成开场
    const response = await axios.post(
      modelConfig.url,
      {
        model: modelConfig.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '请生成故事开场，包括旁白介绍和NPC的首次对话。' }
        ],
        temperature: 0.8,
        max_tokens: 1500
      },
      {
        headers: {
          'Authorization': `Bearer ${modelConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices?.[0]?.message?.content || response.data.content || '';

    console.log('[Story Opening] AI原始回复:', content);

    // 解析 AI 响应（JSON格式）
    let responseData = null;
    let hasNpcDialog = false;

    // 尝试从响应中提取JSON
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      try {
        responseData = JSON.parse(jsonMatch[1]);
      } catch (e) {
        console.error('JSON解析失败:', e);
      }
    }

    // 如果没有找到代码块格式，尝试直接解析
    if (!responseData) {
      const braceMatch = content.match(/\{[\s\S]*\}/);
      if (braceMatch) {
        try {
          responseData = JSON.parse(braceMatch[0]);
        } catch (e) {
          console.error('JSON解析失败:', e);
        }
      }
    }

    // 如果成功解析JSON，处理响应
    if (responseData && responseData.responses && Array.isArray(responseData.responses)) {
      console.log('[Story Opening] JSON解析成功:', responseData);
      for (const response of responseData.responses) {
        if (response.type === '旁白') {
          if (response.content) {
            story.messages.push({
              type: '旁白',
              content: response.content,
              timestamp: new Date()
            });
          } else {
            console.log('[Story Opening] 警告: 旁白内容为空，跳过');
          }
        } else if (response.type === 'NPC' && response.characterName && response.content) {
          // 检查是否是新 NPC（不在预设角色列表中）
          const existingCharacterIndex = story.characters.findIndex(c => c.name === response.characterName);

          if (existingCharacterIndex === -1) {
            // 这是一个新 NPC，登记到角色列表中
            console.log('[Story Opening] 检测到新NPC，登记到角色列表:', response.characterName);
            story.characters.push({
              role: 'NPC',
              historyId: null,  // 没有对应的历史记录
              name: response.characterName
            });
          }

          // 保存 NPC 对话
          console.log('[Story Opening] 保存NPC对话，名称:', response.characterName);
          story.messages.push({
            type: 'NPC',
            characterName: response.characterName,  // 直接保存名称
            content: response.content,
            timestamp: new Date()
          });
          hasNpcDialog = true;
        }
      }
    } else {
      // JSON解析失败，回退到旧的文本解析方式
      console.log('[Story Opening] JSON解析失败，使用文本解析');
      const lines = content.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('旁白：') || line.startsWith('【旁白】') || line.includes('故事发生在')) {
          const narration = line.replace(/^旁白：|【旁白】/g, '').trim();
          if (narration) {
            story.messages.push({
              type: '旁白',
              content: narration,
              timestamp: new Date()
            });
          }
        } else if (line.match(/^[\\w\\u4e00-\\u9fa5]+[:：]/)) {
          const match = line.match(/^([\\w\\u4e00-\\u9fa5]+)[:：](.+)$/);
          if (match) {
            const characterName = match[1].trim();
            const dialogContent = match[2].trim();
            const characterIndex = story.characters.findIndex(c => c.name === characterName);

            if (characterIndex !== -1) {
              story.messages.push({
                type: 'NPC',
                characterId: characterIndex,
                content: dialogContent,
                timestamp: new Date()
              });
              hasNpcDialog = true;
            } else {
              story.messages.push({
                type: '旁白',
                content: line,
                timestamp: new Date()
              });
            }
          }
        } else if (line.trim()) {
          story.messages.push({
            type: '旁白',
            content: line.trim(),
            timestamp: new Date()
          });
        }
      }
    }

    // 如果没有 NPC 对话，随机选择一个 NPC 生成开场对话
    if (!hasNpcDialog && story.characters.length > 1) {
      const npcIndex = story.characters.findIndex(c => c.role === 'NPC');
      if (npcIndex !== -1) {
        const npc = story.characters[npcIndex];
        story.messages.push({
          type: 'NPC',
          characterId: npcIndex,
          content: `你好，我是${npc.name}。欢迎来到这个世界！`,
          timestamp: new Date()
        });
      }
    }

    // 更新元数据
    story.metadata.totalMessages = story.messages.length;
    story.metadata.lastMessageAt = new Date();
    story.metadata.openingGenerating = false;  // 标记开场生成完成

    await story.save();

    console.log('[Story Opening] 开场生成完成');

  } catch (error) {
    console.error('生成故事开场失败:', error);
    // 即使失败也要标记为完成
    if (story && story._id) {
      try {
        const updatedStory = await Story.findById(story._id);
        if (updatedStory) {
          updatedStory.metadata.openingGenerating = false;
          await updatedStory.save();
        }
      } catch (saveError) {
        console.error('保存开场生成状态失败:', saveError);
      }
    }
  }
}

/**
 * 构建故事开场提示词
 */
function buildStoryOpeningPrompt(story) {
  let prompt = `你正在为一个故事生成开场。请按照以下要求生成：

## 故事信息
**故事名称**：${story.name}

## 🌍 世界观
${story.world.worldName ? `**世界名称**：${story.world.worldName}\n` : ''}
**时代背景**：${story.world.era || '未知'}
**科技水平**：${story.world.technology || '未知'}
**魔法体系**：${typeof story.world.magicSystem === 'string' ? story.world.magicSystem : story.world.magicSystem?.name || '无'}
**文化背景**：${story.world.culture || '未知'}
${story.world.geography ? `**地理环境**：${story.world.geography}\n` : ''}

## 📖 故事情节
${story.plot.title ? `**情节标题**：${story.plot.title}\n` : ''}
${story.plot.summary ? `**情节概要**：${story.plot.summary}\n` : ''}
**故事类型**：${story.plot.genre || '未知'}
**关键词**：${Array.isArray(story.plot.keywords) ? story.plot.keywords.join(', ') : story.plot.keywords || '无'}
${story.plot.themes?.length ? `**主题**：${story.plot.themes.join(', ')}\n` : ''}

## 🎭 角色设定
`;

  story.characters.forEach((char, index) => {
    prompt += `${index + 1}. ${char.role}：${char.name}\n`;
    if (char.archetype) prompt += `   原型：${char.archetype}\n`;
    if (char.setting) prompt += `   背景：${char.setting}\n`;
    if (char.traits) {
      const traits = Array.isArray(char.traits) ? char.traits.join(', ') : char.traits;
      prompt += `   特质：${traits}\n`;
    }
    if (char.personality) prompt += `   性格：${char.personality}\n`;
    if (char.backstory) prompt += `   背景故事：${char.backstory}\n`;
    prompt += '\n';
  });

  prompt += `## 🎯 生成要求
请生成故事的开场，包括：
1. **旁白介绍**：用叙述性的语言介绍故事的背景、场景和当前状态（100-200字）
2. **NPC首次对话**：选择一个NPC角色，让他/她开始第一次对话

## 📝 输出格式
请严格按照以下JSON格式返回（注意：每个字段都必须填写，不能为空）：
\`\`\`json
{
  "responses": [
    {
      "type": "旁白",
      "content": "叙述性文字（必须填写，不能为空）"
    },
    {
      "type": "NPC",
      "characterName": "角色名（必须填写，不能为空）",
      "content": "对话内容（必须填写，不能为空）"
    }
  ]
}
\`\`\`

## ⚠️ 重要提示
- 旁白要简洁生动，营造氛围
- NPC对话要符合角色性格和设定
- 对话要自然，不要过于生硬
- 只生成一个NPC的对话即可
- 必须返回JSON格式
- **每个字段都必须填写，不能为null或空**
- NPC对话不能放在旁白里
- 不能代替主角说话
- 返回语言为中文

请开始生成：`;

  return prompt;
}

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
  if (story.world.worldName) prompt += `**世界名称**：${story.world.worldName}\n`;
  prompt += `时代背景：${story.world.era || '未知'}\n`;
  prompt += `科技水平：${story.world.technology || '未知'}\n`;
  if (typeof story.world.magicSystem === 'string') {
    prompt += `魔法体系：${story.world.magicSystem || '无'}\n`;
  } else if (story.world.magicSystem && story.world.magicSystem.name) {
    prompt += `魔法体系：${story.world.magicSystem.name}\n`;
    if (story.world.magicSystem.rules) {
      prompt += `魔法规则：${story.world.magicSystem.rules.join(', ')}\n`;
    }
  }
  prompt += `文化背景：${story.world.culture || '未知'}\n`;
  if (story.world.geography) prompt += `地理环境：${story.world.geography}\n`;
  if (story.world.religions?.length) prompt += `宗教信仰：${story.world.religions.join(', ')}\n`;
  prompt += '\n';

  // 情节
  prompt += '## 📖 故事情节\n';
  if (story.plot.title) prompt += `**情节标题**：${story.plot.title}\n`;
  if (story.plot.summary) prompt += `**情节概要**：${story.plot.summary}\n`;
  prompt += `类型：${story.plot.genre || '未知'}\n`;
  prompt += `复杂度：${story.plot.complexity || '未知'}\n`;
  if (story.plot.keywords?.length) {
    prompt += `关键词：${Array.isArray(story.plot.keywords) ? story.plot.keywords.join(', ') : story.plot.keywords}\n`;
  }
  if (story.plot.themes?.length) prompt += `主题：${story.plot.themes.join(', ')}\n`;
  prompt += '\n';

  // 角色
  prompt += '## 🎭 角色设定\n';
  story.characters.forEach((char, index) => {
    prompt += `${index + 1}. ${char.role} - ${char.name || '未命名'}\n`;
    if (char.archetype) prompt += `   原型：${char.archetype}\n`;
    if (char.setting) prompt += `   背景：${char.setting}\n`;
    if (char.traits) {
      const traits = Array.isArray(char.traits) ? char.traits.join(', ') : char.traits;
      prompt += `   特质：${traits}\n`;
    }
    if (char.personality) prompt += `   性格：${char.personality}\n`;
    if (char.appearance) prompt += `   外貌：${char.appearance}\n`;
    if (char.motivation) prompt += `   动机：${char.motivation}\n`;
    if (char.abilities?.length) prompt += `   能力：${char.abilities.join(', ')}\n`;
    prompt += '\n';
  });

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
  prompt += '3. 对话要自然、生动，符合角色性格\n';
  prompt += '4. **旁白使用规则（重要）**：\n';
  prompt += '   - **动作、神态、语气必须用旁白**：角色的表情、动作、神态、语气变化等，都要放在旁白中\n';
  prompt += '   - **对话只包含纯文本**：NPC的对话内容应该是纯文本，不包含括号、动作描写等\n';
  prompt += '   - **不要滥用长段旁白**：简短的动作可以省略，只在重要时刻使用旁白\n';
  prompt += '   - **示例**：\n';
  prompt += '     * 错误：NPC对话包含"(深棕色的头发微微晃动，语气冰冷) 带路？不，我不能。"\n';
  prompt += '     * 正确：旁白描述动作，NPC对话只说"带路？不，我不能。"\n';
  prompt += '   - **常见需要旁白的情况**：\n';
  prompt += '     * 动作描写（深棕色的头发微微晃动、推开大门、拔出武器等）\n';
  prompt += '     * 神态描写（右眼的光芒收敛、微笑、皱眉、眼神变化等）\n';
  prompt += '     * 语气描写（语气冰冷而直接、声音颤抖、轻声说道等）\n';
  prompt += '     * 场景变化（突然下雨、灯光熄灭等）\n';
  prompt += '5. 不要跳出角色身份\n';
  prompt += '6. AI需要决定哪个角色出场回应（可以是任何NPC，但不能是主角）\n';
  prompt += '7. AI不能代替主角说话，主角只能由用户控制\n';
  prompt += '8. 返回语言为中文\n';
  prompt += '9. 必须使用JSON格式返回\n';

  return prompt;
}

/**
 * 辅助函数：构建用户提示词
 */
function buildUserPrompt(story, content) {
  const mainCharacter = story.characters.find(c => c.role === '主角');
  const mainCharacterName = mainCharacter?.name || '主角';

  let prompt = `## 🎯 用户输入\n`;
  prompt += `${mainCharacterName}说：${content}\n\n`;
  prompt += `## 🎯 AI的任务\n`;
  prompt += `请根据以上背景设定和对话历史，继续故事。\n`;
  prompt += `AI需要决定哪个角色出场回应（可以是任何NPC，但不能是主角）。\n`;
  prompt += `AI可以一次回复多条对话，由不同角色说出。\n`;
  prompt += `\n`;
  prompt += `## 📝 输出格式说明\n`;
  prompt += `**重要：动作、神态、语气必须用旁白，对话只包含纯文本**\n`;
  prompt += `\n`;
  prompt += `❌ **错误示例**（不要这样做）：\n`;
  prompt += `\`\`\`json\n`;
  prompt += `{\n`;
  prompt += `  "responses": [\n`;
  prompt += `    {\n`;
  prompt += `      "type": "NPC",\n`;
  prompt += `      "characterName": "赛琳娜",\n`;
  prompt += `      "content": "(深棕色的头发微微晃动，语气冰冷) 带路？不，我不能。"\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n`;
  prompt += `\`\`\`\n`;
  prompt += `\n`;
  prompt += `✅ **正确示例**（动作用旁白，对话是纯文本）：\n`;
  prompt += `\`\`\`json\n`;
  prompt += `{\n`;
  prompt += `  "responses": [\n`;
  prompt += `    {\n`;
  prompt += `      "type": "旁白",\n`;
  prompt += `      "content": "深棕色的头发微微晃动，右眼的光芒完全收敛，语气变得冰冷而直接"\n`;
  prompt += `    },\n`;
  prompt += `    {\n`;
  prompt += `      "type": "NPC",\n`;
  prompt += `      "characterName": "赛琳娜",\n`;
  prompt += `      "content": "带路？不，我不能。我的存在依赖于'永恒网络'的记忆背景辐射，离开这片废墟，我就会像没有空气的火焰一样熄灭。"\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n`;
  prompt += `\`\`\`\n`;
  prompt += `\n`;
  prompt += `## 📝 旁白使用指南\n`;
  prompt += `**动作、神态、语气必须用旁白，不要混在对话中**\n`;
  prompt += `\n`;
  prompt += `✅ **必须使用旁白的情况**：\n`;
  prompt += `- 动作描写（深棕色的头发微微晃动、推开大门、拔出武器等）\n`;
  prompt += `- 神态描写（右眼的光芒完全收敛、微笑、皱眉、眼神变化等）\n`;
  prompt += `- 语气描写（语气变得冰冷而直接、声音颤抖、轻声说道等）\n`;
  prompt += `- 场景变化（突然下雨、灯光熄灭、地震等）\n`;
  prompt += `\n`;
  prompt += `❌ **不要滥用长段旁白**：\n`;
  prompt += `- 简单的动作可以省略（如：点头、摇头）\n`;
  prompt += `- 不要在每次对话前都加长段旁白\n`;
  prompt += `- 只在重要时刻使用旁白\n`;
  prompt += `\n`;
  prompt += `**重要原则**：\n`;
  prompt += `- **动作神态用旁白**：括号中的内容都应该移到旁白\n`;
  prompt += `- **对话是纯文本**：NPC的对话内容应该是纯文本，不包含任何括号或动作\n`;
  prompt += `- **简洁为王**：旁白应该简洁，不要长篇大论\n`;
  prompt += `- **自然流畅**：重要的动作才用旁白，普通对话不需要\n`;
  prompt += `\n`;
  prompt += `请严格按照以下JSON格式返回：\n`;
  prompt += `\`\`\`json\n`;
  prompt += `{\n`;
  prompt += `  "responses": [\n`;
  prompt += `    {\n`;
  prompt += `      "type": "旁白",  // 描述动作、神态、语气\n`;
  prompt += `      "content": "简短的动作或神态描述"\n`;
  prompt += `    },\n`;
  prompt += `    {\n`;
  prompt += `      "type": "NPC",\n`;
  prompt += `      "characterName": "角色名（必须填写，不能为空）",\n`;
  prompt += `      "content": "纯文本对话（必须填写，不能为空，不包含括号）"\n`;
  prompt += `    }\n`;
  prompt += `  ]\n`;
  prompt += `}\n`;
  prompt += `\`\`\`\n\n`;
  prompt += `重要规则：\n`;
  prompt += `1. 必须返回JSON格式，包含responses数组\n`;
  prompt += `2. type只能是"旁白"或"NPC"\n`;
  prompt += `3. NPC对话必须包含characterName字段（不能为空）\n`;
  prompt += `4. 旁白不需要characterName字段，但必须有content字段（不能为空）\n`;
  prompt += `5. 不能代替主角说话（主角只能由用户控制）\n`;
  prompt += `6. NPC对话不能放在旁白里\n`;
  prompt += `7. **所有content字段都必须填写，不能为null或空字符串**\n`;
  prompt += `8. **动作、神态、语气必须用旁白，不要混在对话中**\n`;

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
async function checkAndCompressMemory(storyId, modelConfig) {
  const story = await Story.findById(storyId);
  if (!story) return null;

  // 如果没有模型配置，无法压缩
  if (!modelConfig) {
    return null;
  }

  // 分离消息：记忆消息 vs 原始对话
  const memoryMessages = story.messages.filter(m => m.type === '记忆');
  const dialogueMessages = story.messages.filter(m => m.type !== '记忆');

  // 检查是否需要压缩（原始对话 >= 60条时，压缩前50条，保留最新的10条）
  // 这样压缩后至少还有10条可见的对话消息
  if (dialogueMessages.length < 60) {
    return null;
  }

  // 获取最远的50条对话消息（最早的50条），保留最新的10条
  const messagesToCompress = dialogueMessages.slice(0, 50);
  const dialogueToKeep = dialogueMessages.slice(50);

  // 构建记忆压缩提示词
  const systemPrompt = `你是一个故事记忆压缩专家。请将以下对话历史压缩成简洁的记忆摘要。

对话历史：
${JSON.stringify(messagesToCompress, null, 2)}

请生成一个简洁的记忆摘要，包含：
- 关键情节发展
- 角色关系变化
- 重要事件
- 当前状态

摘要风格类似旁白，但要更简洁、更具概括性。
字数控制在200字以内。`;

  try {
    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`
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

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || data.content || '';

    if (summary) {
      // 保存到 memories
      story.memories.push({
        summary: summary,
        timestamp: new Date()
      });

      // 更新 messages：保留所有之前的记忆 + 新的记忆 + 最新的10条对话
      story.messages = [
        ...memoryMessages,  // 保留所有之前的记忆
        {
          type: '记忆',
          content: summary,
          timestamp: new Date()
        },
        ...dialogueToKeep  // 保留最新的10条对话
      ];

      await story.save();

      return summary;
    }
  } catch (error) {
    console.error('[Memory] 记忆压缩错误:', error);
  }

  return null;
}

/**
 * 辅助函数：解析AI响应（JSON格式）
 * 返回 { success: boolean, responses: array, error: string|null }
 */
function parseAIResponse(content) {
  const results = [];

  // 尝试从响应中提取JSON
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const responseData = JSON.parse(jsonMatch[1]);
      if (responseData.responses && Array.isArray(responseData.responses)) {
        for (const response of responseData.responses) {
          if (response.type === '旁白' && response.content) {
            results.push({
              type: '旁白',
              content: response.content
            });
          } else if (response.type === 'NPC' && response.characterName && response.content) {
            results.push({
              type: 'NPC',
              characterName: response.characterName,
              content: response.content
            });
          }
        }
        return { success: true, responses: results, error: null };
      }
    } catch (e) {
      return { success: false, responses: [], error: `JSON解析失败: ${e.message}` };
    }
  }

  // 如果没有找到代码块格式，尝试直接解析
  const braceMatch = content.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      const responseData = JSON.parse(braceMatch[0]);
      if (responseData.responses && Array.isArray(responseData.responses)) {
        for (const response of responseData.responses) {
          if (response.type === '旁白' && response.content) {
            results.push({
              type: '旁白',
              content: response.content
            });
          } else if (response.type === 'NPC' && response.characterName && response.content) {
            results.push({
              type: 'NPC',
              characterName: response.characterName,
              content: response.content
            });
          }
        }
        return { success: true, responses: results, error: null };
      }
    } catch (e) {
      return { success: false, responses: [], error: `JSON解析失败: ${e.message}` };
    }
  }

  // JSON解析失败，回退到旧的文本解析方式
  const lines = content.split('\n').filter(line => line.trim());

  for (const line of lines) {
    if (line.startsWith('旁白：') || line.startsWith('【旁白】') || line.includes('故事发生在')) {
      const narration = line.replace(/^旁白：|【旁白】/g, '').trim();
      if (narration) {
        results.push({
          type: '旁白',
          content: narration
        });
      }
    } else if (line.match(/^[\\w\\u4e00-\\u9fa5]+[:：]/)) {
      const match = line.match(/^([\\w\\u4e00-\\u9fa5]+)[:：](.+)$/);
      if (match) {
        const characterName = match[1].trim();
        const dialogContent = match[2].trim();
        results.push({
          type: 'NPC',
          characterName: characterName,
          content: dialogContent
        });
      }
    } else if (line.trim()) {
      results.push({
        type: '旁白',
        content: line.trim()
      });
    }
  }

  // 文本解析也没有结果，返回错误
  if (results.length === 0) {
    return { success: false, responses: [], error: '无法解析AI响应格式' };
  }

  return { success: true, responses: results, error: null };
}

/**
 * POST /api/story/:id/message
 * 发送消息（流式）
 */
router.post('/:id/message', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    // 验证必填字段
    if (!content) {
      return res.status(400).json({ success: false, error: '缺少消息内容' });
    }

    // 获取故事
    const story = await Story.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!story) {
      return res.status(404).json({ success: false, error: '故事不存在' });
    }

    // 构建提示词（让 AI 决定哪个角色出场）
    const systemPrompt = buildSystemPrompt(story);
    const userPrompt = buildUserPrompt(story, content);

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({
        success: false,
        error: '未找到模型配置，请先选择或配置AI模型'
      });
    }

    // 保存用户消息（作为主角）
    const mainCharacterIndex = story.characters.findIndex(c => c.role === '主角');
    const messageData = {
      type: '主角',
      characterId: mainCharacterIndex !== -1 ? mainCharacterIndex : undefined,
      content: content,
      timestamp: new Date()
    };

    await saveMessage(story._id, messageData);

    // 流式调用AI（带重试机制）
    let retryCount = 0;
    const maxRetries = 5;

    const callAIWithRetry = async () => {
      let fullContent = '';

      await callAIStream(
        userPrompt,
        systemPrompt,
        res,
        0,
        modelConfig,
        async (finalContent) => {
          fullContent = finalContent;

          // 解析AI响应（JSON格式）
          const parseResult = parseAIResponse(finalContent);

          // 如果解析失败且还有重试次数，重新调用AI
          if (!parseResult.success && retryCount < maxRetries) {
            retryCount++;
            console.log(`[Message] JSON解析失败，第${retryCount}次重试...`);

            // 等待一小段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));

            // 重新调用AI
            await callAIWithRetry();
            return;
          }

          // 达到最大重试次数仍然失败
          if (!parseResult.success && retryCount >= maxRetries) {
            throw new Error(`JSON解析失败，已重试${maxRetries}次: ${parseResult.error}`);
          }

          // 解析成功，处理每个响应
          for (const response of parseResult.responses) {
            if (response.type === '旁白') {
              // 保存旁白
              await saveMessage(story._id, {
                type: '旁白',
                content: response.content,
                timestamp: new Date()
              });
            } else if (response.type === 'NPC') {
              // 查找对应的角色（用于检查是否是主角）
              const mainCharacterIndex = story.characters.findIndex(c => c.role === '主角');
              const mainCharacter = story.characters[mainCharacterIndex];

              // 检查是否是主角（AI不应该代替主角说话）
              if (mainCharacter && response.characterName === mainCharacter.name) {
                // AI试图代替主角说话，作为旁白保存
                await saveMessage(story._id, {
                  type: '旁白',
                  content: `[主角旁白] ${response.content}`,
                  timestamp: new Date()
                });
              } else {
                // 检查是否是新 NPC（不在预设角色列表中）
                const existingCharacterIndex = story.characters.findIndex(c => c.name === response.characterName);

                if (existingCharacterIndex === -1) {
                  // 这是一个新 NPC，登记到角色列表中
                  story.characters.push({
                    role: 'NPC',
                    historyId: null,
                    name: response.characterName
                  });
                  await story.save();
                }

                // 保存 NPC 对话
                await saveMessage(story._id, {
                  type: 'NPC',
                  characterName: response.characterName,
                  content: response.content,
                  timestamp: new Date()
                });
              }
            }
          }

          // 检查是否需要记忆压缩
          await checkAndCompressMemory(story._id, modelConfig);
        }
      );
    };

    await callAIWithRetry();

  } catch (error) {
    console.error('发送消息错误:', error);
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

module.exports = router;
