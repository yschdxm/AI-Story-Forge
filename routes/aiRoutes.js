const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');
const History = require('../models/History');
const { JWT_SECRET } = require('../middleware/auth');
const { callAIStream, getModelConfigFromRequest } = require('../services/aiService');
const { generateAndDownloadImages } = require('../services/imageService');

/**
 * 从JWT获取用户
 */
async function getUserFromRequest(req) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return null;

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    return await User.findById(decoded.userId);
  } catch (error) {
    return null;
  }
}

/**
 * 调用AI进行结构化解析（非流式）
 */
async function parseStructuredData(content, toolType, modelConfig) {
  const parsePrompts = {
    character: {
      system: `你是一个数据解析专家。请将以下Markdown格式的角色描述解析为JSON格式。

请返回以下JSON格式：
{
  "name": "角色名称",
  "archetype": "角色原型",
  "setting": "背景设定",
  "traits": ["特质1", "特质2", ...],
  "appearance": "外貌特征",
  "personality": "性格描述",
  "backstory": "背景故事",
  "motivation": "动机与目标",
  "abilities": ["能力1", "能力2", ...],
  "roleInStory": "在故事中的角色"
}

如果某些字段不存在，请返回空字符串或空数组。不要添加额外字段。返回纯JSON，不要包含Markdown代码块标记。`,
      user: `请解析以下角色描述：\n\n${content}`
    },
    plot: {
      system: `你是一个数据解析专家。请将以下Markdown格式的情节描述解析为JSON格式。

请返回以下JSON格式：
{
  "title": "情节标题",
  "summary": "情节概要",
  "genre": "故事类型",
  "complexity": "复杂度",
  "keywords": ["关键词1", "关键词2", ...],
  "acts": [
    {
      "actNumber": 1,
      "title": "幕标题",
      "description": "幕描述",
      "keyEvents": ["事件1", "事件2", ...]
    }
  ],
  "climax": "高潮",
  "resolution": "结局",
  "themes": ["主题1", "主题2", ...]
}

如果某些字段不存在，请返回空字符串或空数组。不要添加额外字段。返回纯JSON，不要包含Markdown代码块标记。`,
      user: `请解析以下情节描述：\n\n${content}`
    },
    world: {
      system: `你是一个数据解析专家。请将以下Markdown格式的世界描述解析为JSON格式。

请返回以下JSON格式：
{
  "worldName": "世界名称",
  "era": "时代背景",
  "technology": "科技水平",
  "magicSystem": {
    "name": "魔法体系名称",
    "rules": ["规则1", "规则2", ...],
    "limitations": ["限制1", "限制2", ...],
    "source": "魔法来源"
  },
  "culture": "文化背景",
  "geography": "地理环境",
  "politics": "政治制度",
  "economy": "经济体系",
  "religions": ["宗教1", "宗教2", ...],
  "notableLocations": [
    {
      "name": "地点名称",
      "description": "地点描述"
    }
  ],
  "uniqueFeatures": ["特征1", "特征2", ...]
}

如果某些字段不存在，请返回空字符串或空数组。不要添加额外字段。返回纯JSON，不要包含Markdown代码块标记。`,
      user: `请解析以下世界描述：\n\n${content}`
    },
    visual: {
      system: `你是一个数据解析专家。请将以下Markdown格式的场景描述解析为JSON格式。

请返回以下JSON格式：
{
  "sceneName": "场景名称",
  "description": "场景描述",
  "location": "地点",
  "time": "时间",
  "atmosphere": "氛围",
  "visualElements": [
    {
      "element": "元素名称",
      "description": "元素描述"
    }
  ],
  "lighting": "光照",
  "colors": ["颜色1", "颜色2", ...],
  "composition": "构图",
  "artStyle": "艺术风格",
  "mood": "情绪"
}

如果某些字段不存在，请返回空字符串或空数组。不要添加额外字段。返回纯JSON，不要包含Markdown代码块标记。`,
      user: `请解析以下场景描述：\n\n${content}`
    },
    style: {
      system: `你是一个数据解析专家。请将以下Markdown格式的风格转换描述解析为JSON格式。

请返回以下JSON格式：
{
  "originalText": "原始文本",
  "targetStyle": "目标风格",
  "transformedText": "转换后的文本",
  "styleElements": [
    {
      "element": "风格元素",
      "description": "元素描述"
    }
  ],
  "tone": "语调",
  "vocabulary": ["词汇1", "词汇2", ...],
  "sentenceStructure": "句子结构特点"
}

如果某些字段不存在，请返回空字符串或空数组。不要添加额外字段。返回纯JSON，不要包含Markdown代码块标记。`,
      user: `请解析以下风格转换描述：\n\n${content}`
    },
    cowrite: {
      system: `你是一个数据解析专家。请将以下Markdown格式的互动写作描述解析为JSON格式。

请返回以下JSON格式：
{
  "storyTitle": "故事标题",
  "continuation": "续写内容",
  "tone": "故事基调",
  "continueWithType": "续写类型",
  "newCharacters": [
    {
      "name": "角色名称",
      "description": "角色描述"
    }
  ],
  "plotDevelopment": "情节发展",
  "newLocations": ["地点1", "地点2", ...],
  "themes": ["主题1", "主题2", ...]
}

如果某些字段不存在，请返回空字符串或空数组。不要添加额外字段。返回纯JSON，不要包含Markdown代码块标记。`,
      user: `请解析以下互动写作描述：\n\n${content}`
    },
    puzzle: {
      system: `你是一个数据解析专家。请将以下Markdown格式的谜题描述解析为JSON格式。

请返回以下JSON格式：
{
  "puzzleName": "谜题名称",
  "puzzleType": "谜题类型",
  "difficulty": "难度",
  "theme": "主题",
  "setting": "背景设定",
  "description": "谜题描述",
  "clues": [
    {
      "clue": "线索",
      "hint": "提示"
    }
  ],
  "solution": "解决方案",
  "redHerrings": ["误导信息1", "误导信息2", ...],
  "timeLimit": "时间限制",
  "rewards": ["奖励1", "奖励2", ...]
}

如果某些字段不存在，请返回空字符串或空数组。不要添加额外字段。返回纯JSON，不要包含Markdown代码块标记。`,
      user: `请解析以下谜题描述：\n\n${content}`
    },
    names: {
      system: `你是一个数据解析专家。请将以下Markdown格式的名字列表解析为JSON格式。

请返回以下JSON格式：
{
  "culture": "文化背景",
  "gender": "性别",
  "era": "时代",
  "names": [
    {
      "name": "名字",
      "meaning": "含义",
      "pronunciation": "发音",
      "gender": "性别"
    }
  ],
  "namingConventions": "命名规则",
  "examples": ["使用示例1", "使用示例2", ...]
}

如果某些字段不存在，请返回空字符串或空数组。不要添加额外字段。返回纯JSON，不要包含Markdown代码块标记。`,
      user: `请解析以下名字列表：\n\n${content}`
    }
  };

  const prompt = parsePrompts[toolType];
  if (!prompt) return null;

  try {
    const response = await axios.post(
      modelConfig.url,
      {
        model: modelConfig.modelId,
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user }
        ],
        temperature: 0.7,
        max_tokens: 2000
      },
      {
        headers: {
          'Authorization': `Bearer ${modelConfig.apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const content = response.data.choices?.[0]?.message?.content || response.data.content || '';

    // 清理响应，移除Markdown代码块标记
    const cleanedContent = content
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();

    try {
      return JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('JSON解析失败:', parseError.message);
      console.error('原始内容:', cleanedContent);
      return null;
    }
  } catch (error) {
    console.error('结构化解析失败:', error.message);
    if (error.response) {
      console.error('响应状态:', error.response.status);
      console.error('响应数据:', error.response.data);
    }
    return null;
  }
}

/**
 * 保存历史记录到用户账户（支持结构化数据）
 */
async function saveHistoryWithStructured(req, toolType, content, inputParams, structuredData) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) return;

    const historyData = {
      userId: user._id,
      toolType,
      content,
      inputParams
    };

    // 添加结构化数据
    if (structuredData) {
      historyData.structuredData = {
        [toolType]: structuredData
      };
    }

    const history = new History(historyData);
    await history.save();

    // 如果是角色生成，同时生成图片
    if (toolType === 'character' && structuredData) {
      try {
        console.log('[History] 开始生成角色图片...');

        // 使用默认配置（头像使用seedream-4.5，因为doubao-seededit-3.0-i2i已下线）
        const imageConfig = {
          apiKey: user.doubaoConfig?.apiKey || '8111a62f-0f7c-42f2-ba06-3f52201ac62f',
          baseUrl: user.doubaoConfig?.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
          portraitModel: user.doubaoConfig?.portraitModel || 'doubao-seedream-4-5-251128',
          avatarModel: user.doubaoConfig?.avatarModel || 'doubao-seedream-4-5-251128'
        };

        const { portraitBase64, avatarBase64, portraitUrl, avatarUrl } = await generateAndDownloadImages(
          structuredData,
          imageConfig
        );

        // 更新历史记录，添加图片数据
        history.portraitImage = portraitBase64;
        history.avatarImage = avatarBase64;
        history.portraitUrl = portraitUrl;
        history.avatarUrl = avatarUrl;
        await history.save();

        console.log('[History] 角色图片生成完成');
      } catch (imgError) {
        console.warn('[History] 生成角色图片失败:', imgError.message);
        // 图片生成失败不影响历史记录保存
      }
    }
  } catch (saveError) {
    console.warn('保存历史记录失败:', saveError.message);
  }
}

// API路由 - 角色生成器（流式）
router.post('/generate-character', async (req, res) => {
  try {
    const { archetype, setting, traits } = req.body;

    const systemPrompt = `你是一个专业的角色设定大师，擅长创造富有深度和创意的角色。请以Markdown格式返回角色信息，包含以下部分：

**🎭 角色名称** - 角色的完整姓名
**📋 角色原型** - 角色的核心原型描述
**📖 背景故事** - 详细的角色背景和经历
**🎯 性格特质** - 角色的性格特点和行为模式
**👁️ 外貌特征** - 角色的外观描述
**💡 动机与目标** - 角色的驱动力和追求
**✨ 独特能力** - 角色的特殊技能或天赋

请使用Markdown格式，包含适当的标题、列表和强调，让内容更易读。返回语言为中文。`;

    const userPrompt = `生成一个${archetype}类型的角色，背景设定在${setting}，具有${traits}等特质。请创造一个独特且有深度的角色，包含完整的角色设定。`;

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    // 流式调用AI，返回给前端
    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, async (fullContent) => {
      // AI生成完成后，进行结构化解析
      const structuredData = await parseStructuredData(fullContent, 'character', modelConfig);

      // 保存历史记录（包含结构化数据）
      await saveHistoryWithStructured(req, 'character', fullContent, { archetype, setting, traits }, structuredData);
    });
  } catch (error) {
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

// API路由 - 情节编织器（流式）
router.post('/weave-plot', async (req, res) => {
  try {
    const { keywords, genre, complexity } = req.body;

    const systemPrompt = `你是一个情节设计专家，擅长创造多分支的故事线。请以Markdown格式返回，包含：简介、3个情节分支、每个分支的转折点和可能的结局。返回语言为中文。`;

    const userPrompt = `基于关键词[${keywords}]，创作一个${genre}风格的故事框架。复杂度：${complexity}。提供3个不同的情节发展方向。`;

    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, async (fullContent) => {
      const structuredData = await parseStructuredData(fullContent, 'plot', modelConfig);
      await saveHistoryWithStructured(req, 'plot', fullContent, { keywords, genre, complexity }, structuredData);
    });
  } catch (error) {
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

// API路由 - 场景可视化描述（流式）
router.post('/visualize-scene', async (req, res) => {
  try {
    const { sceneDescription, artStyle } = req.body;

    const systemPrompt = `你是一位视觉描述专家，擅长将文字场景转化为生动的视觉描述。请提供详细的视觉描述，包括：主要元素、氛围、色彩、光影、构图，以及可用于AI绘图的详细提示词。`;

    const userPrompt = `将以下场景转换为视觉描述，采用${artStyle}风格：${sceneDescription}`;

    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, async (fullContent) => {
      const structuredData = await parseStructuredData(fullContent, 'visual', modelConfig);
      await saveHistoryWithStructured(req, 'visual', fullContent, { sceneDescription, artStyle }, structuredData);
    });
  } catch (error) {
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

// API路由 - 风格转换器（流式）
router.post('/transform-style', async (req, res) => {
  try {
    const { text, targetStyle } = req.body;

    const systemPrompt = `你是一个文学风格转换大师，能够将任何文本转换为指定的文学风格，同时保持原意。`;

    const userPrompt = `请将以下文本转换为${targetStyle}风格，请保持原意但运用该风格的典型特征：${text}`;

    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, async (fullContent) => {
      const structuredData = await parseStructuredData(fullContent, 'style', modelConfig);
      await saveHistoryWithStructured(req, 'style', fullContent, { text, targetStyle }, structuredData);
    });
  } catch (error) {
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

// API路由 - 互动写作（AI续写）（流式）
router.post('/co-write', async (req, res) => {
  try {
    const { storySoFar, tone, continueWithType } = req.body;

    const systemPrompt = `你是一位创意写作伙伴，擅长与人类协作创作故事。你的角色是${continueWithType}。保持连贯性，但要带来惊喜和创意。语言请保持原文语言。`;

    const userPrompt = `这是故事的当前内容：${storySoFar}。请继续创作，采用${tone}的基调。`;

    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, async (fullContent) => {
      const structuredData = await parseStructuredData(fullContent, 'cowrite', modelConfig);
      await saveHistoryWithStructured(req, 'cowrite', fullContent, { storySoFar, tone, continueWithType }, structuredData);
    });
  } catch (error) {
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

// API路由 - 世界构建器（流式）
router.post('/build-world', async (req, res) => {
  try {
    const { era, technology, magicSystem, culture } = req.body;

    const systemPrompt = `你是一位世界构建大师，擅长创造完整、自洽、富有创意的虚构世界。请以Markdown格式返回，包含以下部分：

**🌍 世界名称** - 世界的名称
**📜 时代背景** - 时代特征和历史背景
**⚙️ 科技水平** - 科技发展程度和特色
**✨ 魔法体系** - 魔法的规则、限制和表现形式
**🏛️ 社会结构** - 政治、经济、文化体系
**🗺️ 地理特征** - 主要地形和重要地点
**🎭 文化特色** - 习俗、信仰、艺术等
**⚔️ 冲突与挑战** - 世界面临的主要问题

请使用Markdown格式，包含适当的标题、列表和强调，让内容更易读。返回语言为中文。`;

    const userPrompt = `请构建一个${era}时代的世界，科技水平为${technology}，包含${magicSystem}的魔法系统，文化背景为${culture}。请创造一个完整且富有创意的虚构世界。`;

    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, async (fullContent) => {
      const structuredData = await parseStructuredData(fullContent, 'world', modelConfig);
      await saveHistoryWithStructured(req, 'world', fullContent, { era, technology, magicSystem, culture }, structuredData);
    });
  } catch (error) {
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

// API路由 - 谜题设计器（流式）
router.post('/design-puzzle', async (req, res) => {
  try {
    const { puzzleType, difficulty, theme, setting } = req.body;

    const systemPrompt = `你是一位谜题设计大师，擅长创造创意、有趣、逻辑严密的谜题。请以Markdown格式返回，包含：

**🧩 谜题名称** - 谜题的名称
**📋 谜题描述** - 谜题的背景和情境
**🔍 线索与提示** - 提供给解谜者的线索
**💡 解谜思路** - 解谜的逻辑和方法（可选，可作为答案部分）
**✨ 创意亮点** - 这个谜题的独特之处

请使用Markdown格式，包含适当的标题、列表和强调。谜题要富有创意且逻辑严密。返回语言为中文。`;

    const userPrompt = `请设计一个${puzzleType}类型的谜题，难度为${difficulty}，主题是${theme}，背景设定在${setting}。请创造一个富有创意且逻辑严密的谜题。`;

    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, async (fullContent) => {
      const structuredData = await parseStructuredData(fullContent, 'puzzle', modelConfig);
      await saveHistoryWithStructured(req, 'puzzle', fullContent, { puzzleType, difficulty, theme, setting }, structuredData);
    });
  } catch (error) {
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

// API路由 - 名字生成器（流式）
router.post('/generate-names', async (req, res) => {
  try {
    const { culture, gender, era, count } = req.body;

    const systemPrompt = `你是一位名字设计专家，擅长创造符合文化背景、时代特征和性别特点的名字。请以Markdown格式返回，包含：

**📋 名字列表** - 生成的名字（每个名字附带简短说明）
**📖 名字含义** - 每个名字的含义和来源
**🎨 文化背景** - 名字所属的文化特征
**💡 使用建议** - 适合的角色类型和场景

请使用Markdown格式，包含适当的标题、列表和强调。返回语言为中文。`;

    const userPrompt = `请生成${count}个${gender}名字，符合${culture}文化背景，时代为${era}。每个名字请附带含义说明。`;

    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, async (fullContent) => {
      const structuredData = await parseStructuredData(fullContent, 'names', modelConfig);
      await saveHistoryWithStructured(req, 'names', fullContent, { culture, gender, era, count }, structuredData);
    });
  } catch (error) {
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

// API路由 - 为历史记录中的角色生成图片
router.post('/generate-character-images/:historyId', async (req, res) => {
  try {
    const { historyId } = req.params;

    // 获取历史记录
    const history = await History.findById(historyId);
    if (!history) {
      return res.status(404).json({ success: false, error: '历史记录不存在' });
    }

    // 验证是否是角色类型
    if (history.toolType !== 'character') {
      return res.status(400).json({ success: false, error: '该历史记录不是角色类型' });
    }

    // 检查是否已经有图片
    if (history.portraitImage && history.avatarImage) {
      return res.json({
        success: true,
        message: '角色已有图片',
        portraitUrl: history.portraitUrl,
        avatarUrl: history.avatarUrl
      });
    }

    // 获取用户配置
    const user = await getUserFromRequest(req);
    if (!user) {
      return res.status(401).json({ success: false, error: '未授权' });
    }

    // 获取结构化数据
    const characterData = history.structuredData?.character;
    if (!characterData) {
      return res.status(400).json({ success: false, error: '角色数据不完整' });
    }

    console.log('[Generate Images] 开始生成角色图片...');

    // 使用默认配置
    const imageConfig = {
      apiKey: user.doubaoConfig?.apiKey || '8111a62f-0f7c-42f2-ba06-3f52201ac62f',
      baseUrl: user.doubaoConfig?.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
      portraitModel: user.doubaoConfig?.portraitModel || 'doubao-seedream-4-5-251128',
      avatarModel: user.doubaoConfig?.avatarModel || 'doubao-seededit-3-0-i2i-250628'
    };

    // 生成图片
    const { portraitBase64, avatarBase64, portraitUrl, avatarUrl } = await generateAndDownloadImages(
      characterData,
      imageConfig
    );

    // 更新历史记录
    history.portraitImage = portraitBase64;
    history.avatarImage = avatarBase64;
    history.portraitUrl = portraitUrl;
    history.avatarUrl = avatarUrl;
    await history.save();

    console.log('[Generate Images] 角色图片生成完成');

    res.json({
      success: true,
      message: '图片生成成功',
      portraitUrl,
      avatarUrl
    });

  } catch (error) {
    console.error('生成角色图片失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
