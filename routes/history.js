const express = require('express');
const router = express.Router();
const History = require('../models/History');
const { authenticateToken } = require('../middleware/auth');

// 保存历史记录
router.post('/save', authenticateToken, async (req, res) => {
  try {
    const { toolType, content, inputParams, tags } = req.body;

    // 验证输入
    if (!toolType || !content) {
      return res.status(400).json({ success: false, error: '缺少必要字段' });
    }

    // 创建历史记录
    const history = new History({
      userId: req.user._id,
      toolType,
      content,
      inputParams: inputParams || {},
      tags: tags || []
    });

    // 提取元数据（为情景演绎功能预留）
    if (inputParams) {
      history.metadata = extractMetadata(toolType, inputParams);
    }

    await history.save();

    res.status(201).json({
      success: true,
      message: '历史记录已保存',
      history: {
        id: history._id,
        toolType: history.toolType,
        createdAt: history.createdAt
      }
    });
  } catch (error) {
    console.error('保存历史记录错误:', error);
    res.status(500).json({ success: false, error: '保存失败' });
  }
});

// 获取用户的历史记录
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { toolType, page = 1, limit = 20, favorite } = req.query;

    const query = { userId: req.user._id };

    if (toolType) {
      query.toolType = toolType;
    }

    if (favorite !== undefined) {
      query.isFavorite = favorite === 'true';
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [histories, total] = await Promise.all([
      History.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      History.countDocuments(query)
    ]);

    res.json({
      success: true,
      histories: histories.map(h => ({
        id: h._id,
        toolType: h.toolType,
        content: h.content,
        inputParams: h.inputParams,
        structuredData: h.structuredData,
        tags: h.tags,
        isFavorite: h.isFavorite,
        portraitImage: h.portraitImage,
        avatarImage: h.avatarImage,
        portraitUrl: h.portraitUrl,
        avatarUrl: h.avatarUrl,
        createdAt: h.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取历史记录错误:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 获取单条历史记录
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const history = await History.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!history) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    res.json({
      success: true,
      history: {
        id: history._id,
        toolType: history.toolType,
        content: history.content,
        inputParams: history.inputParams,
        structuredData: history.structuredData,
        tags: history.tags,
        isFavorite: history.isFavorite,
        metadata: history.metadata,
        portraitImage: history.portraitImage,
        avatarImage: history.avatarImage,
        portraitUrl: history.portraitUrl,
        avatarUrl: history.avatarUrl,
        createdAt: history.createdAt
      }
    });
  } catch (error) {
    console.error('获取历史记录错误:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 收藏/取消收藏历史记录
router.put('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const { favorite } = req.body;

    const history = await History.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!history) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    history.isFavorite = favorite;
    await history.save();

    res.json({
      success: true,
      message: favorite ? '已收藏' : '已取消收藏',
      isFavorite: history.isFavorite
    });
  } catch (error) {
    console.error('收藏记录错误:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// 删除历史记录
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const history = await History.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!history) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    res.json({
      success: true,
      message: '记录已删除'
    });
  } catch (error) {
    console.error('删除历史记录错误:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

// 清空所有历史记录
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const result = await History.deleteMany({ userId: req.user._id });

    res.json({
      success: true,
      message: '历史记录已清空',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('清空历史记录错误:', error);
    res.status(500).json({ success: false, error: '清空失败' });
  }
});

// 获取情景演绎可用的选项（预留接口）
router.get('/scenario/options', authenticateToken, async (req, res) => {
  try {
    // 从用户的历史记录中提取可复用的元素
    const histories = await History.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(100);

    const options = {
      characters: [],
      plots: [],
      visuals: [],
      cowrites: [],
      worlds: [],
      names: [],
      puzzles: []
    };

    histories.forEach(history => {
      const { toolType, inputParams, metadata } = history;

      // 提取角色信息
      if (toolType === 'character' && inputParams) {
        const characterData = {
          id: history._id,
          archetype: inputParams.archetype,
          setting: inputParams.setting,
          traits: inputParams.traits,
          createdAt: history.createdAt
        };
        options.characters.push(characterData);
      }

      // 提取情节信息
      if (toolType === 'plot' && inputParams) {
        const plotData = {
          id: history._id,
          keywords: inputParams.keywords,
          genre: inputParams.genre,
          complexity: inputParams.complexity,
          createdAt: history.createdAt
        };
        options.plots.push(plotData);
      }

      // 提取世界信息
      if (toolType === 'world' && inputParams) {
        const worldData = {
          id: history._id,
          era: inputParams.era,
          technology: inputParams.technology,
          magicSystem: inputParams.magicSystem,
          culture: inputParams.culture,
          createdAt: history.createdAt
        };
        options.worlds.push(worldData);
      }

      // 提取名字信息
      if (toolType === 'names' && inputParams) {
        const nameData = {
          id: history._id,
          culture: inputParams.culture,
          gender: inputParams.gender,
          era: inputParams.era,
          createdAt: history.createdAt
        };
        options.names.push(nameData);
      }

      // 提取谜题信息
      if (toolType === 'puzzle' && inputParams) {
        const puzzleData = {
          id: history._id,
          puzzleType: inputParams.puzzleType,
          difficulty: inputParams.difficulty,
          theme: inputParams.theme,
          createdAt: history.createdAt
        };
        options.puzzles.push(puzzleData);
      }

      // 提取场景可视化信息
      if (toolType === 'visual' && inputParams) {
        const visualData = {
          id: history._id,
          sceneDescription: inputParams.sceneDescription,
          artStyle: inputParams.artStyle,
          createdAt: history.createdAt
        };
        options.visuals.push(visualData);
      }

      // 提取互动写作信息
      if (toolType === 'cowrite' && inputParams) {
        const cowriteData = {
          id: history._id,
          storySoFar: inputParams.storySoFar,
          tone: inputParams.tone,
          continueWithType: inputParams.continueWithType,
          createdAt: history.createdAt
        };
        options.cowrites.push(cowriteData);
      }
    });

    res.json({
      success: true,
      options: {
        characters: options.characters.slice(0, 20), // 限制数量
        plots: options.plots.slice(0, 20),
        visuals: options.visuals.slice(0, 20),
        cowrites: options.cowrites.slice(0, 20),
        worlds: options.worlds.slice(0, 20),
        names: options.names.slice(0, 20),
        puzzles: options.puzzles.slice(0, 20)
      }
    });
  } catch (error) {
    console.error('获取情景演绎选项错误:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 辅助函数：提取元数据
function extractMetadata(toolType, inputParams) {
  const metadata = {};

  switch (toolType) {
    case 'character':
      metadata.extractedCharacters = [{
        archetype: inputParams.archetype,
        setting: inputParams.setting,
        traits: inputParams.traits
      }];
      break;

    case 'plot':
      metadata.extractedPlots = [{
        keywords: inputParams.keywords,
        genre: inputParams.genre,
        complexity: inputParams.complexity
      }];
      break;

    case 'visual':
      metadata.extractedVisuals = [{
        sceneDescription: inputParams.sceneDescription,
        artStyle: inputParams.artStyle
      }];
      break;

    case 'cowrite':
      metadata.extractedCowrites = [{
        storySoFar: inputParams.storySoFar,
        tone: inputParams.tone,
        continueWithType: inputParams.continueWithType
      }];
      break;

    case 'world':
      metadata.extractedWorlds = [{
        era: inputParams.era,
        technology: inputParams.technology,
        magicSystem: inputParams.magicSystem,
        culture: inputParams.culture
      }];
      break;

    case 'names':
      metadata.extractedNames = [{
        culture: inputParams.culture,
        gender: inputParams.gender,
        era: inputParams.era
      }];
      break;

    case 'puzzle':
      metadata.extractedPuzzles = [{
        puzzleType: inputParams.puzzleType,
        difficulty: inputParams.difficulty,
        theme: inputParams.theme
      }];
      break;
  }

  return metadata;
}

module.exports = router;
