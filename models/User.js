const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// 用户模型
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 20
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  customModels: [{
    name: {
      type: String,
      required: true
    },
    url: {
      type: String,
      required: true
    },
    apiKey: {
      type: String,
      required: true
    },
    modelId: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  selectedModel: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  // 豆包AI配置（用于图片生成）
  doubaoConfig: {
    apiKey: {
      type: String,
      default: '8111a62f-0f7c-42f2-ba06-3f52201ac62f'
    },
    // 立绘生成模型配置
    portraitModel: {
      type: String,
      default: 'doubao-seedream-4-5-251128'
    },
    // 头像裁切模型配置（使用seedream-4.5，因为doubao-seededit-3.0-i2i已下线）
    avatarModel: {
      type: String,
      default: 'doubao-seedream-4-5-251128'
    },
    // API基础URL
    baseUrl: {
      type: String,
      default: 'https://ark.cn-beijing.volces.com/api/v3'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// 密码加密中间件（Mongoose 8+兼容）
// 只在创建新用户或密码字段被直接修改时加密
userSchema.pre('save', async function() {
  // 只有当密码被修改且不是通过 updatePassword 方法时才加密
  if (!this.isModified('password')) {
    return;
  }

  // 检查密码是否已经是哈希格式（以 $2b$ 开头）
  if (this.password.startsWith('$2b$')) {
    // 已经是哈希密码，跳过加密
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// 密码验证方法
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// 更新密码方法（带加密）
// 使用静态方法避免中间件冲突
userSchema.statics.updateUserPassword = async function(userId, newPassword) {
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  // 直接更新数据库，绕过中间件
  return this.updateOne(
    { _id: userId },
    { $set: { password: hashedPassword } }
  );
};

module.exports = mongoose.model('User', userSchema);
