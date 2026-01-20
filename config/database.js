const mongoose = require('mongoose');

// MongoDB连接配置
const connectDB = async () => {
  try {
    // 从环境变量获取MongoDB连接字符串
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-story-forge';

    // Mongoose 8+ 不需要 useNewUrlParser 和 useUnifiedTopology 选项
    await mongoose.connect(mongoURI);

    console.log('✅ MongoDB 连接成功');
    console.log(`📊 数据库: ${mongoose.connection.db.databaseName}`);
  } catch (error) {
    console.error('❌ MongoDB 连接失败:', error.message);
    process.exit(1); // 连接失败时退出进程
  }
};

// 监听连接事件
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB 连接已断开');
});

mongoose.connection.on('error', (error) => {
  console.error('❌ MongoDB 连接错误:', error);
});

module.exports = connectDB;
