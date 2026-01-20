const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const History = require('../models/History');
const { JWT_SECRET } = require('../middleware/auth');
const { callAIStream, getModelConfigFromRequest } = require('../services/aiService');

/**
 * 保存历史记录到用户账户
 * @param {object} req - Express请求对象
 * @param {string} toolType - 工具类型
 * @param {string} content - AI生成的内容
 * @param {object} inputParams - 输入参数
 */
async function saveHistory(req, toolType, content, inputParams) {
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);

      if (user) {
        const history = new History({
          userId: user._id,
          toolType,
          content,
          inputParams
        });
        await history.save();
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

    // 流式调用AI，并在完成后保存历史记录
    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, (fullContent) => {
      saveHistory(req, 'character', fullContent, { archetype, setting, traits });
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

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, (fullContent) => {
      saveHistory(req, 'plot', fullContent, { keywords, genre, complexity });
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

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, (fullContent) => {
      saveHistory(req, 'scene', fullContent, { sceneDescription, artStyle });
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

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, (fullContent) => {
      saveHistory(req, 'style', fullContent, { text, targetStyle });
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

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, (fullContent) => {
      saveHistory(req, 'writing', fullContent, { storySoFar, tone, continueWithType });
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

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, (fullContent) => {
      saveHistory(req, 'world', fullContent, { era, technology, magicSystem, culture });
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

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, (fullContent) => {
      saveHistory(req, 'puzzle', fullContent, { puzzleType, difficulty, theme, setting });
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

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({ success: false, error: '未找到模型配置，请先选择或配置AI模型' });
    }

    await callAIStream(userPrompt, systemPrompt, res, 0, modelConfig, (fullContent) => {
      saveHistory(req, 'name', fullContent, { culture, gender, era, count });
    });
  } catch (error) {
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

module.exports = router;
