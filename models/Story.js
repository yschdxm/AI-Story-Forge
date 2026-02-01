const mongoose = require('mongoose');

// 故事演绎模型
const storySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },

  // 角色配置
  characters: [{
    _id: false,
    role: {
      type: String,
      enum: ['主角', 'NPC'],
      required: true
    },
    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'History',
      required: false  // 改为可选，支持AI临时创建的角色
    },
    name: String,
    archetype: String,
    setting: String,
    traits: [String],  // 数组类型
    appearance: String,
    personality: String,
    backstory: String,
    motivation: String,
    abilities: [String],
    roleInStory: String,
    // 图片字段（Base64格式存储）
    portraitImage: {
      type: String,  // Base64编码的立绘图片数据
      default: null
    },
    avatarImage: {
      type: String,  // Base64编码的头像图片数据
      default: null
    },
    // 图片URL（备用字段）
    portraitUrl: {
      type: String,
      default: null
    },
    avatarUrl: {
      type: String,
      default: null
    }
  }],

  // 情节配置
  plot: {
    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'History',
      required: false  // 支持AI自动生成
    },
    title: String,
    summary: String,
    keywords: [String],  // 数组类型
    genre: String,
    complexity: String,
    acts: [{
      _id: false,
      actNumber: Number,
      title: String,
      description: String,
      keyEvents: [String]
    }],
    climax: String,
    resolution: String,
    themes: [String]
  },

  // 世界观配置
  world: {
    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'History',
      required: false  // 支持AI自动生成
    },
    worldName: String,
    era: String,
    technology: String,
    magicSystem: {
      _id: false,
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
      _id: false,
      name: String,
      description: String
    }],
    uniqueFeatures: [String]
  },

  // 对话历史
  messages: [{
    _id: false,
    type: {
      type: String,
      enum: ['主角', 'NPC', '旁白', '记忆'],
      required: true
    },
    characterId: Number,  // characters数组索引
    characterName: String,  // AI临时创建的角色名称
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 记忆压缩
  memories: [{
    _id: false,
    summary: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],

  // 解析错误重试计数
  parseErrorCount: {
    type: Number,
    default: 0
  },

  // 状态
  status: {
    type: String,
    enum: ['active', 'completed', 'failed'],
    default: 'active'
  },

  // 元数据
  metadata: {
    lastMessageAt: Date,
    totalMessages: Number,
    openingGenerating: Boolean  // 开场是否正在生成
  },

  // 错误状态（用于持久化错误信息，支持手动重试）
  errorState: {
    hasError: {
      type: Boolean,
      default: false
    },
    message: {
      type: String,
      default: null
    },
    errorCode: {
      type: String,
      default: null
    },
    statusCode: {
      type: Number,
      default: null
    },
    userInput: {
      type: String,
      default: null
    },
    timestamp: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true
});

// 索引优化查询
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Story', storySchema);
