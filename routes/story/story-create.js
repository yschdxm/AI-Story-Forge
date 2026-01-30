const express = require('express');
const router = express.Router();
const axios = require('axios');
const History = require('../../models/History');
const Story = require('../../models/Story');
const { authenticateToken } = require('../../middleware/auth');
const { getModelConfigFromRequest } = require('../../services/aiService');
const { buildStoryDataPrompt, buildStoryOpeningPrompt } = require('./story-utils');

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
    if (characters.length < 2) {
      return res.status(400).json({ success: false, error: '角色数量至少需要2个' });
    }
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

module.exports = router;
