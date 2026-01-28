const mongoose = require('mongoose');

// 历史记录模型
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
  // 生成的内容（Markdown格式）
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
  // 结构化数据（AI解析生成的内容）
  structuredData: {
    // 角色生成器
    character: {
      name: String,
      archetype: String,
      setting: String,
      traits: [String],
      appearance: String,
      personality: String,
      backstory: String,
      motivation: String,
      abilities: [String],
      relationships: [{
        name: String,
        relationship: String
      }],
      roleInStory: String
    },
    // 情节编织器
    plot: {
      title: String,
      summary: String,
      genre: String,
      complexity: String,
      keywords: [String],
      acts: [{
        actNumber: Number,
        title: String,
        description: String,
        keyEvents: [String]
      }],
      climax: String,
      resolution: String,
      themes: [String]
    },
    // 场景可视化
    visual: {
      sceneName: String,
      description: String,
      location: String,
      time: String,
      atmosphere: String,
      visualElements: [{
        element: String,
        description: String
      }],
      lighting: String,
      colors: [String],
      composition: String,
      artStyle: String,
      mood: String
    },
    // 风格转换
    style: {
      originalText: String,
      targetStyle: String,
      transformedText: String,
      styleElements: [{
        element: String,
        description: String
      }],
      tone: String,
      vocabulary: [String],
      sentenceStructure: String
    },
    // 互动写作
    cowrite: {
      storyTitle: String,
      continuation: String,
      tone: String,
      continueWithType: String,
      newCharacters: [{
        name: String,
        description: String
      }],
      plotDevelopment: String,
      newLocations: [String],
      themes: [String]
    },
    // 世界构建器
    world: {
      worldName: String,
      era: String,
      technology: String,
      magicSystem: {
        name: String,
        rules: [String],
        limitations: [String],
        source: String
      },
      culture: String,
      geography: String,
      politics: String,
      economy: String,
      religions: [String],
      notableLocations: [{
        name: String,
        description: String
      }],
      uniqueFeatures: [String]
    },
    // 谜题设计器
    puzzle: {
      puzzleName: String,
      puzzleType: String,
      difficulty: String,
      theme: String,
      setting: String,
      description: String,
      clues: [{
        clue: String,
        hint: String
      }],
      solution: String,
      redHerrings: [String],
      timeLimit: String,
      rewards: [String]
    },
    // 名字生成器
    names: {
      culture: String,
      gender: String,
      era: String,
      names: [{
        name: String,
        meaning: String,
        pronunciation: String,
        gender: String
      }],
      namingConventions: String,
      examples: [String]
    }
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
