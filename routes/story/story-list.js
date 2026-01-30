const express = require('express');
const router = express.Router();
const Story = require('../../models/Story');
const { authenticateToken } = require('../../middleware/auth');

/**
 * GET /api/story/list
 * 获取故事列表
 */
router.get('/list', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [stories, total] = await Promise.all([
      Story.find({ userId: req.user._id, status: 'active' })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Story.countDocuments({ userId: req.user._id, status: 'active' })
    ]);

    const formattedStories = stories.map(story => ({
      id: story._id,
      name: story.name,
      characters: story.characters,
      plot: story.plot,
      world: story.world,
      lastMessageAt: story.metadata?.lastMessageAt,
      totalMessages: story.metadata?.totalMessages || 0,
      createdAt: story.createdAt
    }));

    res.json({
      success: true,
      stories: formattedStories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('获取故事列表错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/story/:id
 * 获取故事详情
 */
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!story) {
      return res.status(404).json({ success: false, error: '故事不存在' });
    }

    res.json({
      success: true,
      story: {
        id: story._id,
        name: story.name,
        characters: story.characters,
        plot: story.plot,
        world: story.world,
        messages: story.messages,
        memories: story.memories,
        parseErrorCount: story.parseErrorCount
      }
    });

  } catch (error) {
    console.error('获取故事详情错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/story/:id
 * 删除故事
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const story = await Story.findOneAndDelete({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!story) {
      return res.status(404).json({ success: false, error: '故事不存在' });
    }

    res.json({
      success: true,
      message: '故事已删除'
    });

  } catch (error) {
    console.error('删除故事错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/story
 * 删除所有故事
 */
router.delete('/', authenticateToken, async (req, res) => {
  try {
    const result = await Story.deleteMany({ userId: req.user._id });

    res.json({
      success: true,
      message: `已删除 ${result.deletedCount} 个故事`
    });

  } catch (error) {
    console.error('删除所有故事错误:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
