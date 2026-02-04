# AI Story Forge

**AI 驱动的创意故事工坊** - 一个完整的交互式创意写作助手

## 🎯 项目简介

AI Story Forge 是一个全栈应用，结合了 AI 技术与故事创作，提供完整的角色生成、情节编织、故事演绎、场景可视化等功能。用户可以与 AI 生成的 NPC 进行对话，共同创作故事。

### 🚀 核心功能

1. **故事演绎** - 与 AI 生成的角色进行互动对话
2. **角色生成器** - 创建详细的角色设定，自动生成角色立绘和头像
3. **情节编织器** - 设计多分支的故事情节
4. **场景可视化** - 将文字场景转换为视觉描述
5. **风格转换器** - 将文本转换为不同的文学风格
6. **互动写作板** - 与 AI 共同续写故事
7. **世界构建器** - 创造完整、自洽的虚构世界
8. **谜题设计器** - 为故事设计逻辑严密的谜题
9. **名字生成器** - 生成符合文化背景的名字
10. **历史记录 & 收藏夹** - 保存和管理 AI 生成的内容

## 🏗️ 架构概览

### 后端 (Node.js + Express + MongoDB)

- **主服务器**: `server.js`
- **数据库**: MongoDB (Mongoose ODM)
- **认证**: JWT (JSON Web Token)
- **AI 服务**: 流式调用外部 AI API (SSE)
- **图片生成**: 豆包 AI (Doubao) 图像生成 API

### 前端 (原生 JavaScript SPA)

- 单页应用，无框架依赖
- 粒子背景动画 (Particles.js)
- Markdown 渲染 (Marked.js)
- 响应式设计，支持移动端

## 📁 项目结构

```
AI Story Forge v4/
├── config/
│   └── database.js              # MongoDB 连接配置
├── middleware/
│   └── auth.js                  # JWT 认证中间件
├── models/
│   ├── User.js                  # 用户模型（自定义模型、选中模型）
│   ├── History.js               # AI 生成历史记录
│   ├── Story.js                 # 故事数据模型
│   ├── Settings.js              # 系统设置
│   └── PublicModel.js           # 公共 AI 模型配置
├── routes/
│   ├── auth.js                  # 认证路由
│   ├── user.js                  # 用户管理路由
│   ├── admin.js                 # 管理员路由
│   ├── history.js               # 历史记录管理
│   ├── favorites.js             # 收藏夹管理
│   ├── aiRoutes.js              # AI 工具路由（8个流式接口）
│   └── story/                   # 故事演绎模块
│       ├── index.js             # 故事路由入口
│       ├── story-create.js      # 创建故事
│       ├── story-list.js        # 故事列表管理
│       └── story-chat.js        # 故事对话管理
├── services/
│   ├── aiService.js             # AI 服务核心（流式调用）
│   └── imageService.js          # 图片生成服务
├── scripts/
│   ├── create-admin.js          # 创建管理员账户
│   └── migrate-db.js            # 数据库迁移脚本
├── public/                      # 前端资源
│   ├── index.html               # 主应用页面（8个AI工具）
│   ├── login.html               # 登录页面
│   ├── register.html            # 注册页面
│   ├── user.html                # 用户配置页面
│   ├── admin.html               # 管理员面板
│   ├── style.css                # 样式主入口
│   ├── css/                     # 样式模块（10个文件）
│   └── js/                      # 前端 JavaScript
│       ├── main.js              # 主入口
│       ├── api.js               # API 调用
│       ├── utils.js             # 工具函数
│       ├── tools.js             # 8个AI工具函数
│       ├── dropdown.js          # 自定义下拉菜单组件
│       ├── user-system.js       # 用户认证
│       ├── model-switcher.js    # 模型选择器
│       ├── admin.js             # 管理员面板功能
│       ├── user-profile.js      # 用户中心功能
│       └── story/               # 故事演绎模块
│           ├── index.js          # 故事模块入口
│           ├── story-init.js     # 故事初始化
│           ├── story-list.js     # 故事列表
│           ├── story-create-modal.js  # 创建故事模态框
│           ├── story-chat.js     # 对话功能
│           └── story-role-card.js  # 角色卡片
├── server.js                    # 主服务器入口
├── package.json
├── .env                         # 环境变量（必需）
└── README.md
```

## ⚙️ 环境配置

### 前置要求

- **Node.js** (推荐 18+ 版本)
- **MongoDB** (本地运行或远程)
- **外部 AI API 凭据** (豆包 AI 或其他 OpenAI 兼容 API)

### 安装依赖

```bash
npm install
```

### 环境变量配置

在项目根目录创建 `.env` 文件：

```env
# 服务器配置
PORT=3001
JWT_SECRET=ai-story-forge-secret-key-change-in-production

# MongoDB 连接
MONGODB_URI=mongodb://localhost:27017/ai-story-forge

# 豆包 AI 图像生成 API 凭据请在 services\imageService.js 中配置
```

> **注意**: `.env` 文件是必需的，否则无法正常启动服务器。

## 🚀 运行指南

### 1. 启动 MongoDB

确保 MongoDB 正在运行：

```bash
# Windows
mongod

# 或使用 MongoDB Compass 启动
```

### 2. 创建管理员账户

```bash
# 交互式创建
npm run create-admin

# 或指定用户名密码
npm run create-admin <用户名> <密码>
```

示例：
```bash
npm run create-admin admin admin123
```

### 3. 启动服务器

**开发模式**（带自动重启）：
```bash
npm run dev
```

**生产模式**：
```bash
npm start
```

### 4. 访问应用

打开浏览器访问：`http://localhost:3001`

## 🔑 关键配置说明

### 模型配置解析（优先级）

AI 模型配置按以下顺序解析：

1. **请求体** (`req.body.modelConfig`)
2. **请求头** (`x-model-config`)
3. **用户保存的选定模型**（JWT → 用户数据库）
4. **默认值**（null - 未提供配置将失败）

### 认证流程

1. 用户登录/注册 → 获取 JWT Token
2. Token 存储在 `localStorage` 的 `token` 键下
3. 所有需要认证的 API 请求在 `Authorization` 头中携带 token
4. 后端通过 `authenticateToken` 中间件验证

### 流式响应 (SSE)

AI 工具使用服务器发送事件 (SSE) 进行流式传输：
```javascript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
```

前端通过 `EventSource` API 处理流式响应。

## 📊 数据库模型

### 用户 (User)
- 账户信息（用户名、密码、角色）
- 自定义 AI 模型配置
- 选中的 AI 模型
- 豆包 AI 配置（用于图片生成）

### 历史记录 (History)
- 工具类型（8种）
- 生成内容（Markdown）
- 输入参数
- 结构化数据（JSON）
- 图片数据（角色立绘、头像）
- 收藏状态

### 故事 (Story)
- 故事名称、角色、情节、世界观
- 对话消息（旁白、NPC）
- 模拟记忆
- 元数据（消息数量、生成状态）

### 系统配置 (Settings)
- 注册开关等系统级配置

### 公共模型 (PublicModel)
- 预定义的 AI 模型配置（管理员管理）

## 🛠️ 开发任务

### 添加新的 AI 工具

1. **后端**：在 `routes/aiRoutes.js` 中添加新的路由处理器
2. **前端**：
   - 在 `public/index.html` 中添加 UI 表单
   - 在 `public/js/tools.js` 中添加事件处理器
3. **历史记录**：自动保存（已通过中间件实现）

### 数据库迁移

当修改了模型定义后，需要同步数据库：

```bash
# 预览变更
npm run migrate-db:dry-run

# 仅添加缺失字段
npm run migrate-db

# 添加缺失字段并删除多余字段
npm run migrate-db:remove-extra
```

### 添加自定义 AI 模型

**前端方式**：
1. 登录用户账户
2. 访问用户配置页面
3. 添加自定义模型表单

**API 方式**：
```bash
POST /api/user/models
{
  "name": "自定义模型名称",
  "url": "https://api.example.com/v1",
  "apiKey": "your-api-key",
  "modelId": "model-name"
}
```

### 管理公共模型（管理员）

**前端方式**：
1. 登录管理员账户
2. 访问管理员面板
3. 管理公共模型

**API 方式**：
```bash
# 创建公共模型
POST /api/admin/public-models
{
  "name": "模型名称",
  "url": "https://api.example.com/v1",
  "apiKey": "your-api-key",
  "modelId": "model-name",
  "status": "active"
}

# 更新状态
PUT /api/admin/public-models/:id/status

# 删除
DELETE /api/admin/public-models/:id
```

## 🔧 数据库操作

### MongoDB Shell 命令

```bash
# 连接到 MongoDB shell
mongosh ai-story-forge

# 查看集合
show collections

# 查看用户
db.users.find({}, { username: 1, role: 1, createdAt: 1 })

# 查看历史记录
db.histories.find({ userId: ObjectId("...") }).sort({ createdAt: -1 }).limit(10)

# 查看故事
db.stories.find({ userId: ObjectId("...") })
```

## 🔌 API 端点

### 认证
- `POST /api/auth/register` - 注册
- `POST /api/auth/login` - 登录
- `GET /api/auth/me` - 获取当前用户

### 用户
- `GET /api/user/profile` - 获取用户资料
- `PUT /api/user/profile` - 更新用户资料
- `GET /api/user/models` - 获取自定义模型
- `POST /api/user/models` - 添加自定义模型
- `DELETE /api/user/models/:id` - 删除自定义模型
- `PUT /api/user/selected-model` - 设置选中模型

### AI 工具（流式）
- `POST /api/generate-character` - 角色生成器
- `POST /api/weave-plot` - 情节编织器
- `POST /api/visualize-scene` - 场景可视化
- `POST /api/transform-style` - 风格转换器
- `POST /api/co-write` - 互动写作板
- `POST /api/build-world` - 世界构建器
- `POST /api/design-puzzle` - 谜题设计器
- `POST /api/generate-names` - 名字生成器
- `POST /api/generate-character-images/:historyId` - 生成角色图片

### 故事演绎
- `POST /api/story/create` - 创建故事
- `GET /api/story/list` - 获取故事列表
- `GET /api/story/:id` - 获取故事详情
- `POST /api/story/:id/chat` - 发送对话
- `DELETE /api/story/:id` - 删除故事
- `DELETE /api/story/all` - 删除所有故事
- `GET /api/story/:id/roles` - 获取角色卡片

### 历史记录
- `GET /api/history` - 获取历史记录
- `GET /api/history/:id` - 获取单条记录
- `DELETE /api/history/:id` - 删除历史记录
- `DELETE /api/history/all` - 清空历史记录

### 收藏夹
- `GET /api/favorites` - 获取收藏
- `POST /api/favorites/:id` - 添加收藏
- `DELETE /api/favorites/:id` - 移除收藏

### 管理员
- `GET /api/admin/settings` - 获取系统设置
- `PUT /api/admin/settings` - 更新系统设置
- `GET /api/admin/users` - 获取用户列表
- `GET /api/admin/public-models` - 获取公共模型
- `POST /api/admin/public-models` - 创建公共模型
- `PUT /api/admin/public-models/:id/status` - 更新公共模型状态
- `DELETE /api/admin/public-models/:id` - 删除公共模型

## ⚠️ 已知问题

### 1. 可能生成没有完整信息的 NPC

### 2. 可能存在无法选择故事信息的情况

### 3. 可能存在错误处理不完善的地方


## 🛡️ 安全考虑

### 已知安全问题

1. **JWT 密钥**：默认使用简单密钥，生产环境必须更改
2. **API 密钥**：存储在 MongoDB 中（未加密，生产环境建议加密）
3. **CORS**：当前对所有来源开放（生产环境应限制来源）
4. **无速率限制**：除了 AI API 的 429 重试外，无全局速率限制
5. **无输入验证**：验证在路由处理器中内联完成，不够完善
6. **密码存储**：使用 bcrypt 哈希（盐轮数 10）

## 许可证

本项目遵循 GNU Affero 通用公共许可证 v3.0 **附加商业使用限制条款** 进行授权：

- **非商业用途**：依据 AGPL v3 条款免费使用
- **商业用途**：需获得版权持有人的事先书面许可

商业授权相关事宜，请联系 qilinjingang@qq.com。