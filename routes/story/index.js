const express = require('express');
const router = express.Router();

// 导入子路由
const createRouter = require('./story-create');
const listRouter = require('./story-list');
const chatRouter = require('./story-chat');

// 使用子路由
router.use('/', createRouter);
router.use('/', listRouter);
router.use('/', chatRouter);

module.exports = router;
