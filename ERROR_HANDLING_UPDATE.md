# 故事演绎错误处理机制完善

## 修改概述

完善了故事演绎的错误处理机制，支持不同错误码的差异化处理和错误状态持久化（存储在数据库中）。

## 修改文件

### 数据库模型

#### 1. `models/Story.js`
- **新增** `errorState` 字段：
  ```javascript
  errorState: {
    hasError: Boolean,      // 是否有错误
    message: String,        // 错误消息
    errorCode: String,      // 错误码
    statusCode: Number,     // HTTP状态码
    userInput: String,      // 用户输入
    timestamp: Date         // 错误时间
  }
  ```

### 后端修改

#### 2. `routes/story/story-chat.js`
- **新增** 3个API接口：
  - `POST /api/story/:id/error-state` - 保存错误状态
  - `GET /api/story/:id/error-state` - 获取错误状态
  - `DELETE /api/story/:id/error-state` - 清除错误状态
- **新增** `getErrorCode()` 函数：根据HTTP状态码获取错误码
- **修改** 错误处理逻辑，传递错误码和状态码

#### 3. `services/aiService.js`
- **新增** `getErrorCode()` 函数
- **修改** `callAIStream()` 函数，支持错误码传递

### 前端修改

#### 4. `public/js/story/story-chat.js`
- **新增** 错误状态管理函数：
  - `saveErrorStateToStorage()` - 保存到数据库
  - `loadErrorStateFromStorage()` - 从数据库加载
  - `clearErrorState()` - 清除错误状态（从数据库）
  - `displayErrorInChat()` - 在聊天区域显示错误
  - `retryLastMessage()` - 重试上一条消息
  - `handleSendMessageError()` - 处理发送消息的错误
- **修改** `sendMessage()` - 消息成功发送后清除错误状态
- **修改** `enterStory()` - 加载错误状态
- **修改** `backToStoryList()` - 清除错误状态

#### 5. `public/js/api.js`
- **修改** `sendMessageNonStream()` - 支持错误码传递

#### 6. `public/js/utils.js`
- **新增** 错误码配置常量
- **新增** 辅助函数

#### 7. `public/css/_results.css`
- **新增** 错误消息和重试按钮样式

### 数据库迁移

#### 8. `scripts/migrate-error-state.js`
- 新增脚本，为现有故事添加 `errorState` 字段

#### 9. `package.json`
- 新增命令：`npm run migrate-error-state`

## 错误处理逻辑

### 错误码分类

#### 需要重试的错误（RETRYABLE_ERROR_CODES）
- `BAD_REQUEST` (400): 请求参数错误
- `RATE_LIMITED` (429): 请求过于频繁
- `INTERNAL_SERVER_ERROR` (500): 服务内部错误
- `SERVICE_UNAVAILABLE` (503): 服务暂时不可用
- `UNKNOWN_ERROR`: 未知错误

**处理方式**：
- 显示错误通知
- 不保存错误状态
- 用户可以继续尝试发送新消息

#### 不需要重试的错误（NON_RETRYABLE_ERROR_CODES）
- `UNAUTHORIZED` (401): 认证失败
- `FORBIDDEN` (403): 无权访问
- `MISDIRECTED_REQUEST` (421): API配置错误

**处理方式**：
- 显示错误通知
- 保存错误状态到数据库
- 在聊天区域显示错误消息和重试按钮
- 刷新页面后错误状态保持
- 点击重试按钮可重新发送消息

### 错误状态持久化（数据库）

#### 存储结构
```javascript
// Story 模型的 errorState 字段
{
  hasError: true,
  message: "API密钥无效",
  errorCode: "UNAUTHORIZED",
  statusCode: 401,
  userInput: "用户输入的消息内容",
  timestamp: "2026-02-01T10:00:00.000Z"
}
```

#### 存储位置
- MongoDB 数据库的 `stories` 集合
- 字段路径：`errorState`

#### 生命周期
1. **保存**：当发生不可重试错误时自动保存到数据库
2. **加载**：进入故事聊天页面时从数据库加载
3. **清除**：
   - 消息发送成功时（自动清除）
   - 点击重试按钮后（自动清除）
   - 退出故事时（自动清除）

### 流式传输中的错误处理

#### 后端发送格式
```javascript
// 错误响应（SSE格式）
res.write(`data: ${JSON.stringify({
  error: "错误消息",
  errorCode: "UNAUTHORIZED",
  statusCode: 401
})}\n\n`);
res.end();
```

#### 前端接收处理
1. 读取流数据
2. 解析JSON
3. 检查 `error` 字段
4. 提取 `errorCode` 和 `statusCode`
5. 调用错误处理函数

### 重试机制

#### 手动重试
1. 用户点击重试按钮
2. 从数据库获取保存的 `userInput`
3. 清除错误状态（从数据库）
4. 恢复用户输入到输入框
5. 重新发送消息

#### 自动重试（后端）
- 仅针对429错误（请求过多）
- 指数退避：2s, 4s, 8s
- 最多重试3次

## 使用示例

### 场景1：API密钥无效（401）
1. 用户发送消息
2. 后端返回401错误
3. 前端显示错误通知："发生错误: API密钥无效"
4. 聊天区域显示错误消息和重试按钮
5. 错误状态保存到数据库（stories.errorState）
6. **刷新页面后，错误状态仍然显示**
7. 用户点击重试按钮，重新发送消息

### 场景2：请求过于频繁（429）
1. 用户发送消息
2. 后端返回429错误
3. 前端显示错误通知："发送失败: 请求过于频繁，请稍后再试"
4. 不保存错误状态
5. 用户可以继续发送新消息

### 场景3：服务内部错误（500）
1. 用户发送消息
2. 后端返回500错误
3. 前端显示错误通知："发送失败: AI服务内部错误"
4. 不保存错误状态
5. 用户可以继续发送新消息

## 数据库迁移

### 迁移现有数据
运行以下命令为现有故事添加 `errorState` 字段：

```bash
npm run migrate-error-state
```

### 迁移脚本说明
- 自动查找所有没有 `errorState` 字段的故事
- 为每个故事添加默认的 `errorState`（所有字段为 null 或 false）
- 显示迁移进度和结果

## 注意事项

### 1. 错误码优先级
- 后端传递的 `errorCode` 优先
- 如果没有错误码，使用 `UNKNOWN_ERROR`

### 2. 错误状态持久化
- 仅针对不可重试错误（401, 403, 421）
- 按故事ID存储，不同故事的错误状态独立
- 退出故事时自动清除当前故事的错误状态

### 3. 流式传输
- 错误可能在流式传输的任何时候出现
- 一旦检测到错误，立即终止输出
- 不会保存不完整的信息到数据库

### 4. 重试按钮
- 仅在不可重试错误时显示
- 点击后会清除错误状态并重新发送
- 保持用户原始输入内容

### 5. 数据库操作
- 错误状态保存是异步操作
- 使用 `await` 确保保存完成后再显示错误
- 避免竞态条件

## 测试建议

### 测试用例1：401错误（认证失败）
1. 使用无效的API密钥
2. 发送消息
3. 验证错误状态是否正确保存到数据库
4. 验证重试按钮是否可用
5. 刷新页面，验证错误状态是否保持
6. 点击重试按钮，验证是否正确重试

### 测试用例2：429错误（请求过多）
1. 快速连续发送多条消息
2. 验证错误通知是否显示
3. 验证错误状态是否不保存
4. 验证可以继续发送新消息

### 测试用例3：500错误（服务内部错误）
1. 模拟AI服务内部错误
2. 验证错误通知是否显示
3. 验证错误状态是否不保存
4. 验证可以继续发送新消息

## API 接口文档

### 1. 保存错误状态
```
POST /api/story/:id/error-state
Authorization: Bearer <token>
Content-Type: application/json

请求体：
{
  "message": "错误消息",
  "errorCode": "UNAUTHORIZED",
  "statusCode": 401,
  "userInput": "用户输入"
}

响应：
{
  "success": true,
  "message": "错误状态已保存"
}
```

### 2. 获取错误状态
```
GET /api/story/:id/error-state
Authorization: Bearer <token>

响应：
{
  "success": true,
  "errorState": {
    "hasError": true,
    "message": "错误消息",
    "errorCode": "UNAUTHORIZED",
    "statusCode": 401,
    "userInput": "用户输入",
    "timestamp": "2026-02-01T10:00:00.000Z"
  }
}
```

### 3. 清除错误状态
```
DELETE /api/story/:id/error-state
Authorization: Bearer <token>

响应：
{
  "success": true,
  "message": "错误状态已清除"
}
```

## 兼容性

### 后端兼容性
- 所有AI工具路由（8个工具）都支持错误码传递
- 故事演绎路由支持错误码传递
- 历史记录功能不受影响

### 前端兼容性
- 所有工具函数都支持错误码传递
- 错误处理向后兼容（没有错误码时使用默认行为）
- 样式修改不影响现有功能
