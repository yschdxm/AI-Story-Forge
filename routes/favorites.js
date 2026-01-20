const express = require('express');
const router = express.Router();
const History = require('../models/History');
const { authenticateToken } = require('../middleware/auth');

// 获取收藏夹列表（筛选功能）
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const { toolType, page = 1, limit = 20 } = req.query;

    const query = {
      userId: req.user._id,
      isFavorite: true  // 只获取收藏的记录
    };

    if (toolType) {
      query.toolType = toolType;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [favorites, total] = await Promise.all([
      History.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      History.countDocuments(query)
    ]);

    res.json({
      success: true,
      favorites: favorites.map(f => ({
        id: f._id,
        toolType: f.toolType,
        content: f.content,
        inputParams: f.inputParams,
        tags: f.tags,
        createdAt: f.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('获取收藏夹错误:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 获取单条收藏记录
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const favorite = await History.findOne({
      _id: req.params.id,
      userId: req.user._id,
      isFavorite: true
    });

    if (!favorite) {
      return res.status(404).json({ success: false, error: '收藏记录不存在' });
    }

    res.json({
      success: true,
      favorite: {
        id: favorite._id,
        toolType: favorite.toolType,
        content: favorite.content,
        inputParams: favorite.inputParams,
        tags: favorite.tags,
        metadata: favorite.metadata,
        createdAt: favorite.createdAt
      }
    });
  } catch (error) {
    console.error('获取收藏记录错误:', error);
    res.status(500).json({ success: false, error: '获取失败' });
  }
});

// 取消收藏（从收藏夹移除）
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const favorite = await History.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!favorite) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }

    // 取消收藏（不删除原记录）
    favorite.isFavorite = false;
    await favorite.save();

    res.json({
      success: true,
      message: '已从收藏夹移除'
    });
  } catch (error) {
    console.error('取消收藏错误:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

// 批量取消收藏
router.post('/batch-remove', authenticateToken, async (req, res) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供要移除的ID列表' });
    }

    const result = await History.updateMany(
      {
        _id: { $in: ids },
        userId: req.user._id
      },
      { $set: { isFavorite: false } }
    );

    res.json({
      success: true,
      message: '批量取消收藏成功',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error('批量取消收藏错误:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

module.exports = router;
