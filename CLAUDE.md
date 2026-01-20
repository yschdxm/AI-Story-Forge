# CLAUDE.md

此文件为 Claude Code (claude.ai/code) 在处理此代码库时提供指导。

## 项目概述

**AI Story Forge v3.1** 是一个全栈 Node.js/Express Web 应用程序，作为 AI 驱动的创意写作助手。它提供 8 个 AI 工具，用于生成角色、情节、场景、风格转换、协同写作、世界构建、谜题和角色名称。

## 架构

### 后端 (Express.js + MongoDB)

**主入口点：** `server.js`

应用程序采用分层架构：

```
前端 (public/)
  ↓ HTTP 请求
Express 服务器 (server.js)
  ↓ 路由
API 路由 (routes/)
  ↓ 业务逻辑
模型 (models/) ←→ MongoDB
  ↓ 外部 API
AI 服务 (axios → 外部 AI API)
```

### 核心组件

#### 1. AI 服务函数 (`services/aiService.js`)

- **`callAI()`** - 非流式 AI API 调用，带 429 错误重试（指数退避：2s, 4s, 8s）
- **`callAIStream()`** - 流式 AI API 调用，使用 SSE（服务器发送事件）
- **`getModelConfigFromRequest()`** - 从请求体、请求头或用户保存的选择中检索模型配置

**重要提示：** AI 服务函数定义在 `services/aiService.js` 中，处理：
- 直接调用外部 AI 服务
- 带指数退避的 429 速率限制重试逻辑
- 通过 SSE 的流式响应
- 模型配置解析（来自请求体、请求头或用户配置文件）

#### 2. 数据库模型

- **`User.js`** - 用户账户，支持自定义模型（每个用户最多 10 个），基于角色的访问权限（用户/管理员），以及存储选定的模型
- **`History.js`** - 跟踪 AI 生成历史，包含工具类型、内容、输入参数、标签、元数据（用于未来的场景演绎功能）和收藏
- **`Settings.js`** - 系统设置（注册开关、维护模式）- 单例模式
- **`PublicModel.js`** - 管理员管理的公共 AI 模型配置

#### 3. 认证中间件 (`middleware/auth.js`)

- **`authenticateToken`** - 已登录用户的 JWT 验证
- **`authenticateAdmin`** - 需要管理员角色
- **`optionalAuth`** - 公共端点的可选认证
- **`generateToken`** - 创建 7 天有效期的 JWT 令牌

#### 4. API 路由

**认证路由 (`routes/auth.js`)**
- `POST /api/auth/register` - 用户注册（带注册开关检查）
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/me` - 获取当前用户信息

**用户路由 (`routes/user.js`)**
- `PUT /api/user/username` - 更改用户名
- `PUT /api/user/password` - 更改密码
- `POST /api/user/models` - 添加自定义 AI 模型（最多 10 个）
- `DELETE /api/user/models/:id` - 删除自定义模型
- `GET /api/user/models` - 获取用户的自定义模型
- `PUT /api/user/selected-model` - 保存选定的模型
- `GET /api/user/selected-model` - 获取选定的模型

**历史记录路由 (`routes/history.js`)**
- `POST /api/history/save` - 保存历史记录
- `GET /api/history/list` - 获取用户的历史记录（带分页，按 toolType、收藏筛选）
- `GET /api/history/:id` - 获取单个历史记录
- `PUT /api/history/:id/favorite` - 切换收藏状态
- `DELETE /api/history/:id` - 删除历史记录
- `GET /api/history/scenario/options` - 获取场景演绎的可重用元素（未来功能）

**管理员路由 (`routes/admin.js`)**
- `GET /api/admin/settings` - 获取系统设置
- `PUT /api/admin/settings/registration` - 切换注册开关
- `GET /api/admin/users` - 列出所有用户
- `DELETE /api/admin/users/:id` - 删除用户
- `PUT /api/admin/users/:id/promote` - 提升为管理员
- `PUT /api/admin/users/:id/demote` - 降级为普通用户
- `POST /api/admin/public-models` - 添加公共模型
- `GET /api/admin/public-models` - 列出活跃的公共模型
- `GET /api/admin/admin/public-models-all` - 列出所有公共模型（仅限管理员）
- `PUT /api/admin/public-models/:id/status` - 切换模型状态
- `DELETE /api/admin/public-models/:id` - 删除公共模型

**AI 工具路由 (`routes/aiRoutes.js`)**
- `POST /api/generate-character` - 生成角色档案（流式）
- `POST /api/weave-plot` - 生成故事情节（流式）
- `POST /api/visualize-scene` - 生成场景描述（流式）
- `POST /api/transform-style` - 转换文本风格（流式）
- `POST /api/co-write` - AI 协同写作（流式）
- `POST /api/build-world` - 构建虚构世界（流式）
- `POST /api/design-puzzle` - 设计谜题（流式）
- `POST /api/generate-names` - 生成角色名称（流式）
- `GET /api/health` - 健康检查

**注意：** 所有 AI 工具路由都统一使用流式接口（SSE），通过 `services/aiService.js` 中的 `callAIStream()` 函数实现。历史记录会在用户登录时自动保存。

#### 5. 前端（原生 JavaScript SPA）

**文件：**
- `public/index.html` - 主应用界面，包含 8 个 AI 工具标签页
- `public/login.html` - 登录页面
- `public/register.html` - 注册页面
- `public/user.html` - 用户配置文件（管理凭据、自定义模型）
- `public/admin.html` - 管理员面板（设置、用户管理、模型管理）
- `public/style.css` - 应用样式（主入口文件）
- `public/css/` - 样式模块目录（10 个模块化文件）

**样式模块结构 (`public/css/`)：**
- `_variables.css` - CSS 变量、基础设置、滚动条
- `_base.css` - 基础样式、容器、头部、标签页
- `_components.css` - UI 组件（按钮、链接、开关、信息框等）
- `_forms.css` - 表单样式、输入框、下拉菜单
- `_results.css` - 结果区域、Markdown 样式
- `_user-system.css` - 用户系统样式（认证、用户中心、模型切换器）
- `_admin.css` - 管理员面板样式
- `_modal.css` - 模态框样式
- `_loading.css` - 加载状态、动画
- `_responsive.css` - 响应式设计

**前端模块结构 (`public/js/`)：**

**核心模块（所有页面通用）：**
- `dropdown.js` - 可复用的自定义下拉菜单组件
  - `initCustomSelects()` - 初始化所有下拉菜单
  - `initSingleCustomSelect(selectContainer)` - 初始化单个下拉菜单
  - `createCustomSelect(selectId, options, defaultValue, placeholder)` - 创建下拉菜单 HTML
  - `getCustomSelectValue(selectId)` - 获取下拉菜单的值
- `utils.js` - 工具函数（加载状态、通知、结果显示等）
  - `showLoading(show)` / `hideLoading()` - 加载状态
  - `showNotification(message, type)` - 通知提示
  - `displayResult(elementId, content)` - 显示结果（支持 Markdown）
  - `getToolTypeName(type)` - 获取工具类型名称
- `api.js` - API 调用函数（流式/非流式）
  - `callAPIStream(endpoint, data, onProgress, onComplete, onError)` - 流式 API 调用
  - `callAPI(endpoint, data)` - 非流式 API 调用
- `tools.js` - 8 个 AI 工具的实现函数
  - `generateCharacter()` - 角色生成器
  - `weavePlot()` - 情节编织器
  - `visualizeScene()` - 场景可视化
  - `transformStyle()` - 风格转换器
  - `coWrite()` - 互动写作
  - `buildWorld()` - 世界构建器
  - `designPuzzle()` - 谜题设计器
  - `generateNames()` - 名字生成器
- `user-system.js` - 用户认证和状态管理
  - `checkUserStatus()` - 检查用户状态
  - `logout()` - 退出登录
- `model-switcher.js` - AI 模型选择和管理
  - `loadModelsList()` - 加载模型列表
  - `selectModel(type, modelId)` - 选择模型
  - `getCurrentModel()` - 获取当前模型

**页面特定模块：**
- `main.js` - 主应用入口（index.html）
  - 页面初始化
  - 标签页切换
  - 粒子背景初始化
- `auth.js` - 认证相关功能（登录/注册页面）
  - `login()` - 登录函数
  - `register()` - 注册函数
  - `initAuthPage()` - 认证页面初始化
- `admin.js` - 管理员面板功能（admin.html）
  - `checkAdminStatus()` - 检查管理员权限
  - `loadSystemSettings()` - 加载系统设置
  - `toggleRegistration()` - 切换注册开关
  - `loadUserList()` - 加载用户列表
  - `promoteUser(userId)` - 提权用户
  - `demoteUser(userId)` - 降权用户
  - `deleteUser(userId, username)` - 删除用户
  - `addPublicModel()` - 添加公用模型
  - `loadPublicModels()` - 加载公用模型列表
  - `togglePublicModel(modelId, active)` - 切换公用模型状态
  - `deletePublicModel(modelId, name)` - 删除公用模型
  - `goBack()` - 返回主界面
  - `initAdminTabSwitch()` - 初始化管理员 Tab 切换
- `user-profile.js` - 用户中心功能（user.html）
  - `loadUserInfo()` - 加载用户信息
  - `updateUsername()` - 更新用户名
  - `updatePassword()` - 更新密码
  - `addModel()` - 添加模型
  - `loadModels()` - 加载模型列表
  - `deleteModel(modelId)` - 删除模型
  - `loadHistory()` - 加载历史记录
  - `viewHistory(id)` - 查看历史记录详情
  - `toggleFavorite(id, favorite)` - 收藏/取消收藏
  - `deleteHistory(id)` - 删除历史记录
  - `goBack()` - 返回主界面
  - `initHistoryTypeSelect()` - 初始化历史记录类型下拉菜单
  - `initUserTabSwitch()` - 初始化用户 Tab 切换

**功能：**
- 单页应用，基于标签页导航
- 8 个 AI 工具，带输入参数表单
- 模型切换器（公共模型 + 个人自定义模型）
- 基于 JWT 的认证（存储在 localStorage 中）
- 通过 SSE 的流式响应
- AI 输出的 Markdown 渲染
- Particle.js 背景效果
- 可复用的下拉菜单组件
- 模块化代码组织，便于维护和扩展

## 开发命令

```bash
# 安装依赖
npm install

# 启动 MongoDB（必需）
# Windows: mongod（或使用 MongoDB Compass）
# Linux: sudo systemctl start mongod

# 开发模式（带 nodemon 自动重启）
npm run dev

# 生产模式
npm start

# 创建管理员账户（交互式或通过 CLI 参数）
npm run create-admin
# 或: node scripts/create-admin.js <用户名> <密码>

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
1. 本地运行的 MongoDB 或可通过 MONGODB_URI 访问
2. Node.js（推荐 18+ 版本）
3. 外部 AI API 凭据（通过管理员面板或用户自定义模型配置）

## 关键开发模式

### 模型配置解析

AI 服务使用基于优先级的模型配置解析：

1. **请求体** (`req.body.modelConfig`)
2. **请求头** (`x-model-config`)
3. **用户保存的选定模型**（来自 JWT 令牌 → 用户模型）
4. **默认值**（null - 如果未提供配置将失败）

### 错误处理

- **429 速率限制**：自动重试，带指数退避（2s, 4s, 8s）
- **认证错误**：返回 401 并附带描述性消息
- **验证错误**：返回 400 并附带字段特定错误
- **服务器错误**：返回 500 并附带通用消息（记录到控制台）

### 历史跟踪

所有 AI 工具路由在用户认证后自动保存历史：
- 从 JWT 令牌提取 `userId`
- 存储 `toolType`、`content`、`inputParams`
- 为未来的场景演绎功能提取元数据
- 支持收藏以便快速访问

### 流式响应

AI 工具路由使用服务器发送事件 (SSE) 进行流式传输：
```javascript
res.setHeader('Content-Type', 'text/event-stream');
res.setHeader('Cache-Control', 'no-cache');
res.write(`data: ${JSON.stringify({ content, done: false })}\n\n`);
```

前端通过 `script.js` 中的 `EventSource` API 处理流式传输。

## 重要注意事项

### 已知问题

1. **缺少测试脚本** - `package.json` 引用了 `test-db.js`、`test-api.js`、`test-model-switch.js`，但这些文件在 `scripts/` 中不存在。

2. **无请求验证** - 没有输入验证中间件；验证在路由处理器中内联完成。

3. **无速率限制** - 除了 AI API 调用的 429 重试逻辑外，没有请求速率限制。

4. **CORS 已启用** - CORS 对所有来源启用 (`app.use(cors())`)。在生产环境中考虑限制。

### 安全考虑

- **JWT 密钥**：默认较弱；在生产环境中更改
- **密码哈希**：bcrypt，盐轮数 10
- **基于角色的访问**：用户与管理员权限
- **API 密钥**：存储在 MongoDB 中（生产环境建议加密）
- **CORS**：当前开放；在生产环境中限制为特定来源

### 前端-后端集成

- **认证**：JWT 存储在 `localStorage` 的 `token` 键下
- **API 调用**：使用 `Authorization: Bearer ${token}` 头的 `fetch()`
- **流式传输**：SSE 端点的 `EventSource`
- **模型选择**：所有模型配置存储在服务器端（用户数据库的 `selectedModel` 字段），前端通过 API 获取和更新

**重要**：模型选择必须在登录后才能使用。未登录用户无法选择或保存模型配置。

## 常见开发任务

### 添加新的 AI 工具

1. 在 `routes/aiRoutes.js` 中添加路由处理器
2. 定义系统提示和用户提示模板
3. 使用模型配置调用 `callAIStream()`（流式）
4. 如果已认证，历史记录会自动保存（通过 `saveHistory()` 函数）
5. 在 `public/index.html` 中添加前端表单
6. 在 `public/js/tools.js` 中添加事件处理器

### 修改样式

样式已模块化拆分到 `public/css/` 目录，便于维护：

**修改 CSS 变量：**
- 编辑 `public/css/_variables.css`
- 修改颜色、字体、间距、圆角等全局变量

**修改特定组件：**
- **按钮/链接** → `public/css/_components.css`
- **表单/输入框** → `public/css/_forms.css`
- **结果区域** → `public/css/_results.css`
- **用户系统** → `public/css/_user-system.css`
- **管理员面板** → `public/css/_admin.css`
- **模态框** → `public/css/_modal.css`
- **加载动画** → `public/css/_loading.css`

**添加响应式样式：**
- 编辑 `public/css/_responsive.css`
- 使用 `@media (max-width: 768px)` 查询

**主入口文件：**
- `public/style.css` 使用 `@import` 导入所有模块
- 不需要修改 HTML 文件，路径保持不变

**模块说明：**
- 所有模块文件使用 `_` 前缀，表示是 partial 文件
- CSS 变量在 `:root` 中定义，全局可用
- 响应式设计放在最后，确保覆盖前面的样式

### 前端模块结构

前端代码已拆分为多个模块，位于 `public/js/` 目录：

- **`dropdown.js`** - 可复用的自定义下拉菜单组件
  - `initCustomSelects()` - 初始化所有下拉菜单
  - `initSingleCustomSelect(selectContainer)` - 初始化单个下拉菜单
  - `createCustomSelect(selectId, options, defaultValue, placeholder)` - 创建下拉菜单HTML
  - `getCustomSelectValue(selectId)` - 获取下拉菜单的值

- **`utils.js`** - 工具函数
  - `showLoading(show)` / `hideLoading()` - 加载状态
  - `showNotification(message, type)` - 通知提示
  - `displayResult(elementId, content)` - 显示结果（支持Markdown）
  - `getToolTypeName(type)` - 获取工具类型名称

- **`api.js`** - API调用
  - `callAPIStream(endpoint, data, onProgress, onComplete, onError)` - 流式API调用
  - `callAPI(endpoint, data)` - 非流式API调用

- **`tools.js`** - AI工具函数（8个工具）
  - `generateCharacter()` - 角色生成器
  - `weavePlot()` - 情节编织器
  - `visualizeScene()` - 场景可视化
  - `transformStyle()` - 风格转换器
  - `coWrite()` - 互动写作
  - `buildWorld()` - 世界构建器
  - `designPuzzle()` - 谜题设计器
  - `generateNames()` - 名字生成器

- **`user-system.js`** - 用户系统
  - `checkUserStatus()` - 检查用户状态
  - `logout()` - 退出登录

- **`model-switcher.js`** - 模型切换
  - `loadModelsList()` - 加载模型列表
  - `selectModel(type, modelId)` - 选择模型
  - `getCurrentModel()` - 获取当前模型

- **`main.js`** - 主入口
  - 页面初始化
  - 标签页切换
  - 粒子背景初始化

**使用示例：创建自定义下拉菜单**
```javascript
// 在HTML中添加容器
<div id="my-select-container"></div>

// 在JS中创建
const container = document.getElementById('my-select-container');
const options = [
    { value: 'option1', label: '选项1' },
    { value: 'option2', label: '选项2' }
];

// 创建下拉菜单
container.innerHTML = createCustomSelect('my-select', options, 'option1');

// 初始化功能
const selectContainer = container.querySelector('.custom-select');
initSingleCustomSelect(selectContainer);

// 监听change事件
const nativeSelect = document.getElementById('my-select');
nativeSelect.addEventListener('change', function() {
    console.log('选中的值:', this.value);
});
```

### 同步数据库字段

当修改了模型定义后，需要同步数据库：

```bash
# 1. 预览变更
npm run migrate-db:dry-run

# 2. 应用变更（仅添加字段）
npm run migrate-db

# 3. 如果需要删除多余字段
npm run migrate-db:remove-extra
```

**示例场景：**
- 在 `User.js` 中添加了新字段 `email`
- 运行 `npm run migrate-db:dry-run` 查看将要添加的字段
- 运行 `npm run migrate-db` 将 `email` 字段添加到所有用户文档

### 创建自定义模型

用户可以通过以下方式添加自定义 AI 模型：
- **前端**：用户配置文件页面 → 添加模型表单
- **API**：`POST /api/user/models`，包含 `name`、`url`、`apiKey`、`modelId`

### 管理公共模型（管理员）

管理员可以通过以下方式管理公共模型：
- **前端**：管理员面板 → 公共模型部分
- **API**：`POST /api/admin/public-models`、`PUT /api/admin/public-models/:id/status`、`DELETE /api/admin/public-models/:id`

### 创建管理员账户

```bash
# 交互模式
npm run create-admin

# CLI 参数
node scripts/create-admin.js myadmin securepassword123
```

### 测试 selectedModel 功能

```bash
# 测试数据库中的 selectedModel 存储和读取
npm run test-selected-model
```

该测试会：
1. 连接数据库
2. 查找或创建测试用户
3. 保存 selectedModel 配置
4. 验证保存成功
5. 清除 selectedModel
6. 验证清除成功

### 数据库迁移

```bash
# 预览变更（不实际执行）
npm run migrate-db:dry-run

# 仅添加缺失字段
npm run migrate-db

# 添加缺失字段并删除多余字段
npm run migrate-db:remove-extra
```

**迁移脚本功能：**
- ✅ 自动创建缺失的集合
- ✅ 添加模型中存在但数据库中缺失的字段
- ✅ 删除数据库中存在但模型中不存在的字段（需要 `--remove-extra` 标志）
- ✅ 检测字段类型不匹配并警告
- ✅ 支持预览模式（`--dry-run`）

**使用场景：**
- 开发过程中添加了新字段 → 运行 `npm run migrate-db`
- 重构模型，删除了字段 → 运行 `npm run migrate-db:remove-extra`
- 首次部署 → 运行 `npm run migrate-db` 创建所有集合

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

## 文件结构摘要

```
AI Story Forge v3.1/
├── config/
│   └── database.js          # MongoDB 连接
├── middleware/
│   └── auth.js              # JWT 认证
├── models/
│   ├── User.js              # 用户模型（带自定义模型、选定模型）
│   ├── History.js           # 历史跟踪（8 种工具类型）
│   ├── Settings.js          # 系统设置（注册开关）
│   └── PublicModel.js       # 公共 AI 模型配置
├── routes/
│   ├── auth.js              # 认证（注册、登录、me）
│   ├── user.js              # 用户管理（用户名、密码、模型）
│   ├── admin.js             # 管理员路由（设置、用户、公共模型）
│   ├── history.js           # 历史管理（CRUD、收藏、场景选项）
│   └── aiRoutes.js          # AI 工具路由（8 个流式接口）
├── services/
│   └── aiService.js         # AI 服务（callAI, callAIStream, getModelConfigFromRequest）
├── public/                  # 前端
│   ├── index.html           # 主应用（8 个 AI 工具）
│   ├── login.html           # 登录页面
│   ├── register.html        # 注册页面
│   ├── user.html            # 用户配置文件
│   ├── admin.html           # 管理员面板
│   ├── style.css            # 样式主入口
│   ├── css/                 # 样式模块
│   │   ├── _variables.css   # CSS 变量、基础设置
│   │   ├── _base.css        # 基础样式
│   │   ├── _components.css  # UI 组件
│   │   ├── _forms.css       # 表单样式
│   │   ├── _results.css     # 结果区域
│   │   ├── _user-system.css # 用户系统
│   │   ├── _admin.css       # 管理员面板
│   │   ├── _modal.css       # 模态框
│   │   ├── _loading.css     # 加载动画
│   │   └── _responsive.css  # 响应式
│   └── js/                  # 前端模块
│       ├── dropdown.js      # 可复用的自定义下拉菜单组件
│       ├── utils.js         # 工具函数（加载、通知、结果显示）
│       ├── api.js           # API 调用（流式/非流式）
│       ├── tools.js         # 8 个 AI 工具函数
│       ├── user-system.js   # 用户认证和状态管理
│       ├── model-switcher.js # AI 模型选择和管理
│       ├── main.js          # 主入口和全局事件（index.html）
│       ├── auth.js          # 认证功能（登录/注册页面）
│       ├── admin.js         # 管理员面板功能
│       └── user-profile.js  # 用户中心功能
├── scripts/
│   ├── create-admin.js      # 管理员账户创建
│   └── migrate-db.js        # 数据库迁移（同步模型字段）
├── server.js                # 主服务器（AI 服务函数、AI 工具路由）
├── package.json
├── .env                     # 环境变量
└── .gitignore
```

## API 响应格式

所有 API 响应遵循以下格式：
```json
{
  "success": true,
  "message": "可选消息",
  "data": {...}  // 或特定字段如 "user"、"token"、"histories" 等
}
```

错误响应：
```json
{
  "success": false,
  "error": "错误消息"
}
```

## 测试

项目缺乏正式的测试框架。可以通过以下方式进行手动测试：
1. `npm run dev` 并访问 `http://localhost:3001`
2. 使用浏览器开发者工具测试 API 调用
3. 使用 `curl` 或 Postman 进行 API 测试
4. 检查 MongoDB 的数据持久性

## 生产部署清单

1. 在 `.env` 中将 `JWT_SECRET` 更改为强密钥
2. 将 `MONGODB_URI` 配置为生产数据库
3. 将 CORS 限制为特定来源
4. 启用 HTTPS
5. 设置适当的日志记录（Winston、Morgan）
6. 添加速率限制中间件
7. 考虑添加请求验证（Joi、express-validator）
8. 设置进程管理器（PM2）
9. 配置反向代理（Nginx）
10. 添加错误监控（Sentry）