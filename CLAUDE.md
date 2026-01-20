# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在处理此代码库时提供指导。

## 项目概述

**AI Story Forge v3.1** - AI 驱动的创意写作助手，提供 8 个 AI 工具（角色生成、情节编织、场景可视化、风格转换、协同写作、世界构建、谜题设计、名字生成）。

## 架构

### 后端 (Express.js + MongoDB)

**主入口点：** `server.js`

**核心组件：**

1. **AI 服务 (`services/aiService.js`)**
   - `callAIStream()` - 流式 AI API 调用（SSE）
   - `getModelConfigFromRequest()` - 模型配置解析（请求体 → 请求头 → 用户选中模型 → null）
   - 429 速率限制自动重试（指数退避：2s, 4s, 8s）

2. **数据库模型 (`models/`)**
   - `User.js` - 用户账户（自定义模型 ≤10 个，角色权限，选中模型）
   - `History.js` - AI 生成历史（8 种工具类型，收藏功能）
   - `Settings.js` - 系统设置（注册开关）
   - `PublicModel.js` - 公共 AI 模型配置

3. **认证中间件 (`middleware/auth.js`)**
   - `authenticateToken` - JWT 验证
   - `authenticateAdmin` - 管理员权限验证
   - `optionalAuth` - 可选认证

4. **API 路由 (`routes/`)**
   - `auth.js` - 认证（注册、登录、me）
   - `user.js` - 用户管理（用户名、密码、自定义模型、选中模型）
   - `admin.js` - 管理员路由（设置、用户、公共模型）
   - `history.js` - 历史管理（CRUD、收藏）
   - `aiRoutes.js` - 8 个 AI 工具路由（流式接口）

### 前端 (原生 JavaScript SPA)

**页面：**
- `public/index.html` - 主应用（8 个 AI 工具标签页）
- `public/login.html` - 登录页面
- `public/register.html` - 注册页面
- `public/user.html` - 用户配置文件
- `public/admin.html` - 管理员面板

**前端模块 (`public/js/`)：**
- `dropdown.js` - 可复用的自定义下拉菜单组件
- `utils.js` - 工具函数（加载、通知、结果显示）
- `api.js` - API 调用（流式/非流式）
- `tools.js` - 8 个 AI 工具函数
- `user-system.js` - 用户认证和状态管理
- `model-switcher.js` - AI 模型选择和管理
- `main.js` - 主入口（index.html）
- `auth.js` - 认证功能（登录/注册页面）
- `admin.js` - 管理员面板功能
- `user-profile.js` - 用户中心功能

**样式模块 (`public/css/`)：**
- `_variables.css` - CSS 变量、基础设置
- `_base.css` - 基础样式、容器、头部、标签页
- `_components.css` - UI 组件（按钮、链接、开关等）
- `_forms.css` - 表单样式、输入框、下拉菜单
- `_results.css` - 结果区域、Markdown 样式
- `_user-system.css` - 用户系统样式
- `_admin.css` - 管理员面板样式
- `_modal.css` - 模态框样式
- `_loading.css` - 加载状态、动画
- `_responsive.css` - 响应式设计

## 开发命令

```bash
# 安装依赖
npm install

# 启动 MongoDB（必需）
# Windows: mongod（或使用 MongoDB Compass）

# 开发模式（带 nodemon 自动重启）
npm run dev

# 生产模式
npm start

# 创建管理员账户
npm run create-admin
# 或: node scripts/create-admin.js <用户名> <密码>

# 数据库迁移
npm run migrate-db:dry-run      # 预览变更
npm run migrate-db               # 仅添加缺失字段
npm run migrate-db:remove-extra  # 添加缺失字段并删除多余字段

# 访问应用程序
# http://localhost:3001
```

## 环境配置

**`.env` 文件（必需）：**
```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/ai-story-forge
JWT_SECRET=ai-story-forge-secret-key-change-in-production
```

**先决条件：**
1. 本地运行的 MongoDB
2. Node.js（推荐 18+ 版本）
3. 外部 AI API 凭据（通过管理员面板或用户自定义模型配置）

## 关键开发模式

### 模型配置解析（优先级顺序）

1. **请求体** (`req.body.modelConfig`)
2. **请求头** (`x-model-config`)
3. **用户保存的选定模型**（JWT → 用户数据库）
4. **默认值**（null - 未提供配置将失败）

### 错误处理

- **429 速率限制**：自动重试，带指数退避（2s, 4s, 8s）
- **认证错误**：返回 401
- **验证错误**：返回 400
- **服务器错误**：返回 500

### 历史跟踪

所有 AI 工具路由在用户认证后自动保存历史：
- 从 JWT 令牌提取 `userId`
- 存储 `toolType`、`content`、`inputParams`
- 支持收藏以便快速访问

### 流式响应

AI 工具路由使用服务器发送事件 (SSE) 进行流式传输：
```javascript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
```

前端通过 `EventSource` API 处理流式传输。

## 常见开发任务

### 添加新的 AI 工具

1. 在 `routes/aiRoutes.js` 中添加路由处理器
2. 定义系统提示和用户提示模板
3. 使用模型配置调用 `callAIStream()`（流式）
4. 历史记录会自动保存（如果已认证）
5. 在 `public/index.html` 中添加前端表单
6. 在 `public/js/tools.js` 中添加事件处理器

### 修改样式

**修改 CSS 变量：**
- 编辑 `public/css/_variables.css`

**修改特定组件：**
- 按钮/链接 → `public/css/_components.css`
- 表单/输入框 → `public/css/_forms.css`
- 结果区域 → `public/css/_results.css`
- 用户系统 → `public/css/_user-system.css`
- 管理员面板 → `public/css/_admin.css`
- 模态框 → `public/css/_modal.css`
- 加载动画 → `public/css/_loading.css`
- 响应式 → `public/css/_responsive.css`

**主入口文件：**
- `public/style.css` 使用 `@import` 导入所有模块

### 数据库迁移

当修改了模型定义后，需要同步数据库：

```bash
# 1. 预览变更
npm run migrate-db:dry-run

# 2. 应用变更（仅添加字段）
npm run migrate-db

# 3. 如果需要删除多余字段
npm run migrate-db:remove-extra
```

### 创建自定义模型

用户可以通过以下方式添加自定义 AI 模型：
- **前端**：用户配置文件页面 → 添加模型表单
- **API**：`POST /api/user/models`，包含 `name`、`url`、`apiKey`、`modelId`

### 管理公共模型（管理员）

管理员可以通过以下方式管理公共模型：
- **前端**：管理员面板 → 公共模型部分
- **API**：`POST /api/admin/public-models`、`PUT /api/admin/public-models/:id/status`、`DELETE /api/admin/public-models/:id`

### 数据库操作

```bash
# 连接到 MongoDB shell
mongosh ai-story-forge

# 查看集合
show collections

# 查看用户
db.users.find({}, { username: 1, role: 1, createdAt: 1 })

# 查看历史记录
db.histories.find({ userId: ObjectId("...") }).sort({ createdAt: -1 }).limit(10)
```

## 文件结构

```
AI Story Forge v3.1/
├── config/
│   └── database.js          # MongoDB 连接
├── middleware/
│   └── auth.js              # JWT 认证
├── models/
│   ├── User.js              # 用户模型（自定义模型、选中模型）
│   ├── History.js           # 历史跟踪（8 种工具类型）
│   ├── Settings.js          # 系统设置
│   └── PublicModel.js       # 公共 AI 模型配置
├── routes/
│   ├── auth.js              # 认证
│   ├── user.js              # 用户管理
│   ├── admin.js             # 管理员路由
│   ├── history.js           # 历史管理
│   └── aiRoutes.js          # AI 工具路由（8 个流式接口）
├── services/
│   └── aiService.js         # AI 服务（callAIStream, getModelConfigFromRequest）
├── public/
│   ├── index.html           # 主应用（8 个 AI 工具）
│   ├── login.html           # 登录页面
│   ├── register.html        # 注册页面
│   ├── user.html            # 用户配置文件
│   ├── admin.html           # 管理员面板
│   ├── style.css            # 样式主入口
│   ├── css/                 # 样式模块（10 个文件）
│   └── js/                  # 前端模块（10 个文件）
├── scripts/
│   ├── create-admin.js      # 管理员账户创建
│   └── migrate-db.js        # 数据库迁移
├── server.js                # 主服务器
├── package.json
├── .env                     # 环境变量
└── .gitignore
```

## API 响应格式

**成功响应：**
```json
{
  "success": true,
  "message": "可选消息",
  "data": {...}
}
```

**错误响应：**
```json
{
  "success": false,
  "error": "错误消息"
}
```

## 重要注意事项

### 已知问题

1. **无请求验证** - 验证在路由处理器中内联完成
2. **无速率限制** - 除了 AI API 调用的 429 重试逻辑外
3. **CORS 已启用** - 对所有来源启用（生产环境需限制）

### 安全考虑

- **JWT 密钥**：默认较弱；在生产环境中更改
- **密码哈希**：bcrypt，盐轮数 10
- **API 密钥**：存储在 MongoDB 中（生产环境建议加密）
- **CORS**：当前开放；生产环境限制为特定来源

### 前端-后端集成

- **认证**：JWT 存储在 `localStorage` 的 `token` 键下
- **API 调用**：使用 `Authorization: Bearer ${token}` 头的 `fetch()`
- **流式传输**：SSE 端点的 `EventSource`
- **模型选择**：所有模型配置存储在服务器端（用户数据库的 `selectedModel` 字段）

**重要**：模型选择必须在登录后才能使用。未登录用户无法选择或保存模型配置。
