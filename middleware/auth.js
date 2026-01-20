const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT密钥（从环境变量获取或使用默认值）
const JWT_SECRET = process.env.JWT_SECRET || 'ai-story-forge-secret-key-change-in-production';

// 生成JWT令牌
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '7d' });
};

// 验证JWT中间件（需要登录）
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({ success: false, error: '未登录，请先登录' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, error: '用户不存在' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ success: false, error: '无效的令牌' });
  }
};

// 验证管理员权限中间件
const authenticateAdmin = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, error: '未登录，请先登录' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({ success: false, error: '用户不存在' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, error: '权限不足，需要管理员权限' });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: '登录已过期，请重新登录' });
    }
    return res.status(401).json({ success: false, error: '无效的令牌' });
  }
};

// 可选登录中间件（用于获取用户信息但不强制要求）
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password');
      if (user) {
        req.user = user;
      }
    }
    next();
  } catch (error) {
    next(); // 忽略错误，继续处理
  }
};

module.exports = {
  generateToken,
  authenticateToken,
  authenticateAdmin,
  optionalAuth,
  JWT_SECRET
};
