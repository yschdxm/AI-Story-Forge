const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

// 导入MongoDB连接
const connectDB = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// 连接MongoDB
connectDB();

// ==================== 路由配置 ====================

// 认证路由
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// 用户管理路由
const userRoutes = require('./routes/user');
app.use('/api/user', userRoutes);

// 管理员路由
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);

// 历史记录路由
const historyRoutes = require('./routes/history');
app.use('/api/history', historyRoutes);

// AI工具路由（流式）
const aiRoutes = require('./routes/aiRoutes');
app.use('/api', aiRoutes);

// 心跳检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 AI Story Forge 运行在 http://localhost:${PORT}`);
});
