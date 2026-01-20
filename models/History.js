const mongoose = require('mongoose');

// 历史记录模型（为情景演绎功能预留接口）
const historySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  toolType: {
    type: String,
    required: true,
    enum: ['character', 'plot', 'visual', 'style', 'cowrite', 'world', 'puzzle', 'names']
  },
  // 生成的内容
  content: {
    type: String,
    required: true
  },
  // 输入参数（用于情景演绎时复用）
  inputParams: {
    // 角色生成器
    archetype: String,
    setting: String,
    traits: String,

    // 情节编织器
    keywords: String,
    genre: String,
    complexity: String,

    // 场景可视化
    sceneDescription: String,
    artStyle: String,

    // 风格转换
    text: String,
    targetStyle: String,

    // 互动写作
    storySoFar: String,
    tone: String,
    continueWithType: String,

    // 世界构建器
    era: String,
    technology: String,
    magicSystem: String,
    culture: String,

    // 谜题设计器
    puzzleType: String,
    difficulty: String,
    theme: String,
    puzzleSetting: String,

    // 名字生成器
    culture: String,
    gender: String,
    era: String,
    count: Number
  },
  // 为情景演绎预留的标签字段
  tags: [{
    type: String,
    trim: true
  }],
  // 为情景演绎预留的元数据
  metadata: {
    // 提取的角色信息（用于情景演绎选择）
    extractedCharacters: [{
      name: String,
      archetype: String,
      setting: String,
      traits: String
    }],
    // 提取的情节信息
    extractedPlots: [{
      keywords: String,
      genre: String,
      complexity: String
    }],
    // 提取的场景可视化信息
    extractedVisuals: [{
      sceneDescription: String,
      artStyle: String
    }],
    // 提取的互动写作信息
    extractedCowrites: [{
      storySoFar: String,
      tone: String,
      continueWithType: String
    }],
    // 提取的世界信息
    extractedWorlds: [{
      era: String,
      technology: String,
      magicSystem: String,
      culture: String
    }],
    // 提取的名字信息
    extractedNames: [{
      name: String,
      culture: String,
      gender: String
    }],
    // 提取的谜题信息
    extractedPuzzles: [{
      puzzleType: String,
      difficulty: String,
      theme: String
    }]
  },
  // 是否已收藏（用于情景演绎快速选择）
  isFavorite: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 索引优化查询
historySchema.index({ userId: 1, createdAt: -1 });
historySchema.index({ userId: 1, toolType: 1, createdAt: -1 });
historySchema.index({ isFavorite: 1, userId: 1 });

module.exports = mongoose.model('History', historySchema);
