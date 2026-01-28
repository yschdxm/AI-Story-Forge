const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');

// 修改用户名
router.put('/username', authenticateToken, async (req, res) => {
  try {
    const { newUsername } = req.body;

    if (!newUsername) {
      return res.status(400).json({ success: false, error: '新用户名不能为空' });
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
      return res.status(400).json({ success: false, error: '用户名长度需在3-20个字符之间' });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username: newUsername });
    if (existingUser) {
      return res.status(400).json({ success: false, error: '用户名已存在' });
    }

    // 更新用户名
    const user = await User.findById(req.user._id);
    user.username = newUsername;
    await user.save();

    res.json({
      success: true,
      message: '用户名修改成功',
      user: {
        id: user._id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('修改用户名错误:', error);
    res.status(500).json({ success: false, error: '修改失败，请稍后重试' });
  }
});

// 修改密码
router.put('/password', authenticateToken, async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: '原密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: '新密码长度至少6位' });
    }

    const user = await User.findById(req.user._id);

    // 验证原密码
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, error: '原密码错误' });
    }

    // 使用静态方法更新密码（绕过中间件）
    await User.updateUserPassword(req.user._id, newPassword);

    res.json({
      success: true,
      message: '密码修改成功'
    });
  } catch (error) {
    console.error('修改密码错误:', error);
    res.status(500).json({ success: false, error: '修改失败，请稍后重试' });
  }
});

// 添加自定义模型
router.post('/models', authenticateToken, async (req, res) => {
  try {
    const { name, url, apiKey, modelId } = req.body;

    // 验证输入
    if (!name || !url || !apiKey || !modelId) {
      return res.status(400).json({ success: false, error: '请填写所有字段' });
    }

    const user = await User.findById(req.user._id);

    // 检查模型数量限制（每个用户最多10个自定义模型）
    if (user.customModels.length >= 10) {
      return res.status(400).json({ success: false, error: '已达到自定义模型数量上限（10个）' });
    }

    // 添加模型
    user.customModels.push({ name, url, apiKey, modelId });
    await user.save();

    res.json({
      success: true,
      message: '模型添加成功',
      customModels: user.customModels
    });
  } catch (error) {
    console.error('添加模型错误:', error);
    res.status(500).json({ success: false, error: '添加失败，请稍后重试' });
  }
});

// 删除自定义模型
router.delete('/models/:modelId', authenticateToken, async (req, res) => {
  try {
    const { modelId } = req.params;

    const user = await User.findById(req.user._id);

    // 查找并删除模型
    const modelIndex = user.customModels.findIndex(m => m._id.toString() === modelId);
    if (modelIndex === -1) {
      return res.status(404).json({ success: false, error: '模型不存在' });
    }

    user.customModels.splice(modelIndex, 1);
    await user.save();

    res.json({
      success: true,
      message: '模型删除成功',
      customModels: user.customModels
    });
  } catch (error) {
    console.error('删除模型错误:', error);
    res.status(500).json({ success: false, error: '删除失败，请稍后重试' });
  }
});

// 获取用户的所有自定义模型
router.get('/models', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      customModels: user.customModels
    });
  } catch (error) {
    console.error('获取模型错误:', error);
    res.status(500).json({ success: false, error: '获取失败，请稍后重试' });
  }
});

// 保存用户选择的模型
router.put('/selected-model', authenticateToken, async (req, res) => {
  try {
    const { modelConfig } = req.body;

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, error: '用户不存在' });
    }

    // 如果 modelConfig 为 null 或空，清空选中模型
    if (!modelConfig) {
      user.selectedModel = null;
      await user.save();

      return res.json({
        success: true,
        message: '已清空选中模型',
        selectedModel: null
      });
    }

    // 验证模型配置的完整性（允许部分配置，用于公用模型）
    if (!modelConfig.url || !modelConfig.apiKey || !modelConfig.modelId) {
      console.error('模型配置不完整:', modelConfig);
      return res.status(400).json({
        success: false,
        error: '模型配置不完整，需要 url、apiKey 和 modelId'
      });
    }

    user.selectedModel = modelConfig;
    await user.save();

    res.json({
      success: true,
      message: '模型已切换',
      selectedModel: user.selectedModel
    });
  } catch (error) {
    console.error('保存选中模型错误:', error);
    console.error('错误详情:', error.message);
    console.error('请求体:', req.body);
    res.status(500).json({ success: false, error: '保存失败，请稍后重试' });
  }
});

// 获取用户选择的模型
router.get('/selected-model', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    res.json({
      success: true,
      selectedModel: user.selectedModel
    });
  } catch (error) {
    console.error('获取选中模型错误:', error);
    res.status(500).json({ success: false, error: '获取失败，请稍后重试' });
  }
});

module.exports = router;
