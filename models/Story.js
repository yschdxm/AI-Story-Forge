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
      required: true
    },
    name: String,
    archetype: String,
    setting: String,
    traits: String
  }],

  // 情节配置
  plot: {
    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'History',
      required: true
    },
    keywords: String,
    genre: String,
    complexity: String
  },

  // 世界观配置
  world: {
    historyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'History',
      required: true
    },
    era: String,
    technology: String,
    magicSystem: String,
    culture: String
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
    totalMessages: Number
  }
}, {
  timestamps: true
});

// 索引优化查询
storySchema.index({ userId: 1, createdAt: -1 });
storySchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Story', storySchema);
