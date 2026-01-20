const express = require('express');
const router = express.Router();
const User = require('../models/User');
const PublicModel = require('../models/PublicModel');
const Settings = require('../models/Settings');
const { authenticateAdmin } = require('../middleware/auth');

// 获取系统设置
router.get('/settings', authenticateAdmin, async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      settings: {
        registrationEnabled: settings.registrationEnabled,
        maintenanceMode: settings.maintenanceMode
      }
    });
  } catch (error) {
    console.error('获取设置错误:', error);
    res.status(500).json({ success: false, error: '获取设置失败' });
  }
});

// 更新注册开关
router.put('/settings/registration', authenticateAdmin, async (req, res) => {
  try {
    const { enabled } = req.body;

    const settings = await Settings.getSettings();
    settings.registrationEnabled = enabled;
    await settings.save();

    res.json({
      success: true,
      message: `注册功能已${enabled ? '开启' : '关闭'}`,
      registrationEnabled: settings.registrationEnabled
    });
  } catch (error) {
    console.error('更新注册开关错误:', error);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

// 获取所有用户列表
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find({}, '-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      users: users.map(user => ({
        id: user._id,
        username: user.username,
        role: user.role,
        createdAt: user.createdAt,
        customModelsCount: user.customModels.length
      }))
    });
  } catch (error) {
    console.error('获取用户列表错误:', error);
    res.status(500).json({ success: false, error: '获取用户列表失败' });
  }
});

// 删除用户账户
router.delete('/users/:userId', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // 不能删除自己
    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: '不能删除自己的账户' });
    }

    // 不能删除其他管理员
    const userToDelete = await User.findById(userId);
    if (!userToDelete) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    if (userToDelete.role === 'admin') {
      return res.status(400).json({ success: false, error: '不能删除管理员账户' });
    }

    await User.findByIdAndDelete(userId);

    res.json({
      success: true,
      message: `用户 "${userToDelete.username}" 已删除`
    });
  } catch (error) {
    console.error('删除用户错误:', error);
    res.status(500).json({ success: false, error: '删除用户失败' });
  }
});

// 提权用户为管理员
router.put('/users/:userId/promote', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ success: false, error: '该用户已是管理员' });
    }

    user.role = 'admin';
    await user.save();

    res.json({
      success: true,
      message: `用户 "${user.username}" 已提权为管理员`,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('提权用户错误:', error);
    res.status(500).json({ success: false, error: '提权失败' });
  }
});

// 降权用户为普通用户
router.put('/users/:userId/demote', authenticateAdmin, async (req, res) => {
  try {
    const { userId } = req.params;

    // 不能降权自己
    if (userId.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, error: '不能降权自己的账户' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    if (user.role === 'user') {
      return res.status(400).json({ success: false, error: '该用户已是普通用户' });
    }

    user.role = 'user';
    await user.save();

    res.json({
      success: true,
      message: `用户 "${user.username}" 已降权为普通用户`,
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('降权用户错误:', error);
    res.status(500).json({ success: false, error: '降权失败' });
  }
});

// 添加公用AI模型
router.post('/public-models', authenticateAdmin, async (req, res) => {
  try {
    const { name, url, apiKey, modelId, description } = req.body;

    // 验证输入
    if (!name || !url || !apiKey || !modelId) {
      return res.status(400).json({ success: false, error: '请填写所有必填字段' });
    }

    const publicModel = new PublicModel({
      name,
      url,
      apiKey,
      modelId,
      description: description || '',
      createdBy: req.user._id
    });

    await publicModel.save();

    res.status(201).json({
      success: true,
      message: '公用模型添加成功',
      model: {
        id: publicModel._id,
        name: publicModel.name,
        url: publicModel.url,
        modelId: publicModel.modelId,
        description: publicModel.description,
        isActive: publicModel.isActive
      }
    });
  } catch (error) {
    console.error('添加公用模型错误:', error);
    res.status(500).json({ success: false, error: '添加失败' });
  }
});

// 获取所有公用模型（公开接口，所有用户可访问）
router.get('/public-models', async (req, res) => {
  try {
    const models = await PublicModel.find({ isActive: true })
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      models: models.map(model => ({
        id: model._id,
        name: model.name,
        url: model.url,
        apiKey: model.apiKey,
        modelId: model.modelId,
        description: model.description,
        isActive: model.isActive,
        createdBy: model.createdBy?.username || 'Unknown',
        createdAt: model.createdAt
      }))
    });
  } catch (error) {
    console.error('获取公用模型错误:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 管理员获取所有公用模型（包括禁用的）
router.get('/admin/public-models-all', authenticateAdmin, async (req, res) => {
  try {
    const models = await PublicModel.find({})
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      models: models.map(model => ({
        id: model._id,
        name: model.name,
        url: model.url,
        apiKey: model.apiKey,
        modelId: model.modelId,
        description: model.description,
        isActive: model.isActive,
        createdBy: model.createdBy?.username || 'Unknown',
        createdAt: model.createdAt
      }))
    });
  } catch (error) {
    console.error('获取公用模型错误:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 更新公用模型状态（启用/禁用）
router.put('/public-models/:modelId/status', authenticateAdmin, async (req, res) => {
  try {
    const { modelId } = req.params;
    const { active } = req.body;

    const model = await PublicModel.findById(modelId);
    if (!model) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }

    model.isActive = active;
    await model.save();

    res.json({
      success: true,
      message: `模型已${active ? '启用' : '禁用'}`,
      model: {
        id: model._id,
        name: model.name,
        isActive: model.isActive
      }
    });
  } catch (error) {
    console.error('更新模型状态错误:', error);
    res.status(500).json({ success: false, error: '更新失败' });
  }
});

// 删除公用模型
router.delete('/public-models/:modelId', authenticateAdmin, async (req, res) => {
  try {
    const { modelId } = req.params;

    const model = await PublicModel.findById(modelId);
    if (!model) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }

    await PublicModel.findByIdAndDelete(modelId);

    res.json({
      success: true,
      message: `模型 "${model.name}" 已删除`
    });
  } catch (error) {
    console.error('删除公用模型错误:', error);
    res.status(500).json({ success: false, error: '删除失败' });
  }
});

module.exports = router;
