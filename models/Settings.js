const mongoose = require('mongoose');

// 系统设置模型（用于管理员控制注册开关等）
const settingsSchema = new mongoose.Schema({
  registrationEnabled: {
    type: Boolean,
    default: true
  },
  // 可以扩展其他系统设置
  maintenanceMode: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// 确保只有一个设置文档
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = new this();
    await settings.save();
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
