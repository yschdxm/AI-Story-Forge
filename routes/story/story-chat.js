const express = require('express');
const router = express.Router();
const History = require('../../models/History');
const Story = require('../../models/Story');
const User = require('../../models/User');
const { authenticateToken } = require('../../middleware/auth');
const { callAIStream, getModelConfigFromRequest } = require('../../services/aiService');
const { buildSystemPrompt, buildUserPrompt, parseAIResponse, saveMessage, validateCharacterName, validateCharacterData } = require('./story-utils');
const { generateAndDownloadImages } = require('../../services/imageService');

/**
 * 辅助函数：检查并执行记忆压缩
 */
async function checkAndCompressMemory(storyId, modelConfig) {
  const story = await Story.findById(storyId);
  if (!story) return null;

  // 如果没有模型配置，无法压缩
  if (!modelConfig) {
    return null;
  }

  // 分离消息：记忆消息 vs 原始对话
  const memoryMessages = story.messages.filter(m => m.type === '记忆');
  const dialogueMessages = story.messages.filter(m => m.type !== '记忆');

  // 检查是否需要压缩（保守方案：原始对话 >= 100条时，压缩前70条，保留最新的30条）
  // 这样压缩后至少还有30条可见的对话消息，体验更好
  if (dialogueMessages.length < 100) {
    return null;
  }

  // 获取最远的70条对话消息（最早的70条），保留最新的30条
  const messagesToCompress = dialogueMessages.slice(0, 70);
  const dialogueToKeep = dialogueMessages.slice(70);

  // 构建记忆压缩提示词
  const systemPrompt = `你是一个故事记忆压缩专家。请将以下对话历史压缩成简洁的记忆摘要。

对话历史：
${JSON.stringify(messagesToCompress, null, 2)}

请生成一个简洁的记忆摘要，包含：
- 关键情节发展
- 角色关系变化
- 重要事件
- 当前状态

摘要风格类似旁白，但要更简洁、更具概括性。
字数控制在200字以内。`;

  try {
    const response = await fetch(modelConfig.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${modelConfig.apiKey}`
      },
      body: JSON.stringify({
        model: modelConfig.modelId,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: '请生成记忆摘要。' }
        ],
        temperature: 0.7,
        max_tokens: 500
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const summary = data.choices?.[0]?.message?.content || data.content || '';

    if (summary) {
      // 保存到 memories
      story.memories.push({
        summary: summary,
        timestamp: new Date()
      });

      // 更新 messages：保留所有之前的记忆 + 新的记忆 + 最新的10条对话
      story.messages = [
        ...memoryMessages,  // 保留所有之前的记忆
        {
          type: '记忆',
          content: summary,
          timestamp: new Date()
        },
        ...dialogueToKeep  // 保留最新的10条对话
      ];

      await story.save();

      return summary;
    }
  } catch (error) {
    console.error('[Memory] 记忆压缩错误:', error);
  }

  return null;
}

/**
 * POST /api/story/:id/message
 * 发送消息（流式）
 */
router.post('/:id/message', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;

    // 验证必填字段
    if (!content) {
      return res.status(400).json({ success: false, error: '缺少消息内容' });
    }

    // 获取故事
    const story = await Story.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!story) {
      return res.status(404).json({ success: false, error: '故事不存在' });
    }

    // 构建提示词（让 AI 决定哪个角色出场）
    const systemPrompt = buildSystemPrompt(story);
    const userPrompt = buildUserPrompt(story, content);

    // 获取模型配置
    const modelConfig = req.body.modelConfig || await getModelConfigFromRequest(req);

    if (!modelConfig) {
      return res.status(400).json({
        success: false,
        error: '未找到模型配置，请先选择或配置AI模型'
      });
    }

    // 保存用户消息（作为主角）
    const mainCharacterIndex = story.characters.findIndex(c => c.role === '主角');
    const messageData = {
      type: '主角',
      characterId: mainCharacterIndex !== -1 ? mainCharacterIndex : undefined,
      content: content,
      timestamp: new Date()
    };

    await saveMessage(story._id, messageData);

    // 流式调用AI（带重试机制）
    let retryCount = 0;
    const maxRetries = 5;

    const callAIWithRetry = async () => {
      let fullContent = '';

      await callAIStream(
        userPrompt,
        systemPrompt,
        res,
        0,
        modelConfig,
        async (finalContent) => {
          fullContent = finalContent;
          console.log('[Message] finalContent长度:', finalContent.length);
          console.log('[Message] finalContent内容:', finalContent);

          // 解析AI响应（JSON格式）
          const parseResult = parseAIResponse(finalContent);

          // 如果解析失败且还有重试次数，重新调用AI
          if (!parseResult.success && retryCount < maxRetries) {
            retryCount++;
            console.log(`[Message] JSON解析失败，第${retryCount}次重试...`);

            // 等待一小段时间后重试
            await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));

            // 重新调用AI
            await callAIWithRetry();
            return;
          }

          // 达到最大重试次数仍然失败
          if (!parseResult.success && retryCount >= maxRetries) {
            // 保存错误状态到数据库
            story.errorState = {
              hasError: true,
              message: `JSON解析失败，已重试${maxRetries}次: ${parseResult.error}`,
              errorCode: 'INTERNAL_SERVER_ERROR',
              statusCode: null,
              userInput: content,
              timestamp: new Date()
            };
            await story.save();

            throw new Error(`JSON解析失败，已重试${maxRetries}次: ${parseResult.error}`);
          }

          // 验证角色信息是否完整
          console.log(`[Message] 开始验证角色信息，响应数量: ${parseResult.responses.length}`);
          for (const response of parseResult.responses) {
            console.log(`[Message] 检查响应类型: ${response.type}`);
            if (response.type === 'NPC') {
              // NPC类型：只验证名称
              const nameValidation = validateCharacterName(response.characterName);
              console.log(`[Message] NPC名称验证: ${response.characterName}, 结果: ${nameValidation.valid ? '通过' : '失败 - ' + nameValidation.reason}`);

              if (!nameValidation.valid && retryCount < maxRetries) {
                retryCount++;
                console.log(`[Message] NPC名称验证失败: ${nameValidation.reason}，第${retryCount}次重试...`);

                // 等待一小段时间后重试
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));

                // 重新调用AI
                await callAIWithRetry();
                return;
              } else if (!nameValidation.valid && retryCount >= maxRetries) {
                // 达到最大重试次数，仍然验证失败
                console.log(`[Message] NPC名称验证失败，已重试${maxRetries}次: ${nameValidation.reason}`);

                // 处理其他有效的响应（旁白等）
                for (const resp of parseResult.responses) {
                  if (resp.type === '旁白') {
                    await saveMessage(story._id, {
                      type: '旁白',
                      content: resp.content,
                      timestamp: new Date()
                    });
                  }
                }

                // 保存错误状态到数据库
                story.errorState = {
                  hasError: true,
                  message: `NPC名称验证失败，已重试${maxRetries}次: ${nameValidation.reason}`,
                  errorCode: 'INTERNAL_SERVER_ERROR',
                  statusCode: null,
                  userInput: content,
                  timestamp: new Date()
                };
                await story.save();

                throw new Error(`NPC名称验证失败，已重试${maxRetries}次: ${nameValidation.reason}`);
              }
            } else if (response.type === 'newCharacter') {
              // newCharacter类型：验证完整的角色数据
              console.log(`[Message] 开始验证新角色数据，characterData:`, JSON.stringify(response.characterData, null, 2));
              const charDataValidation = validateCharacterData(response.characterData);
              console.log(`[Message] 新角色验证结果: ${charDataValidation.valid ? '通过' : '失败 - ' + charDataValidation.reason}`);

              if (!charDataValidation.valid && retryCount < maxRetries) {
                retryCount++;
                console.log(`[Message] 新角色信息验证失败: ${charDataValidation.reason}，第${retryCount}次重试...`);

                // 等待一小段时间后重试
                await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));

                // 重新调用AI
                await callAIWithRetry();
                return;
              } else if (!charDataValidation.valid && retryCount >= maxRetries) {
                // 达到最大重试次数，仍然验证失败
                console.log(`[Message] 新角色信息验证失败，已重试${maxRetries}次: ${charDataValidation.reason}`);

                // 处理其他有效的响应（旁白等）
                for (const resp of parseResult.responses) {
                  if (resp.type === '旁白') {
                    await saveMessage(story._id, {
                      type: '旁白',
                      content: resp.content,
                      timestamp: new Date()
                    });
                  } else if (resp.type === 'NPC') {
                    // 只保存NPC对话，不创建新角色
                    await saveMessage(story._id, {
                      type: 'NPC',
                      characterName: resp.characterName,
                      content: resp.content,
                      timestamp: new Date()
                    });
                  }
                }

                // 保存错误状态到数据库
                story.errorState = {
                  hasError: true,
                  message: `新角色信息验证失败，已重试${maxRetries}次: ${charDataValidation.reason}`,
                  errorCode: 'INTERNAL_SERVER_ERROR',
                  statusCode: null,
                  userInput: content,
                  timestamp: new Date()
                };
                await story.save();

                throw new Error(`新角色信息验证失败，已重试${maxRetries}次: ${charDataValidation.reason}`);
              }
            }
          }

          // 解析成功，处理每个响应
          for (const response of parseResult.responses) {
            if (response.type === '旁白') {
              // 保存旁白
              await saveMessage(story._id, {
                type: '旁白',
                content: response.content,
                timestamp: new Date()
              });
            } else if (response.type === 'NPC') {
              // 查找对应的角色（用于检查是否是主角）
              const mainCharacterIndex = story.characters.findIndex(c => c.role === '主角');
              const mainCharacter = story.characters[mainCharacterIndex];

              // 检查是否是主角（AI不应该代替主角说话）
              if (mainCharacter && response.characterName === mainCharacter.name) {
                // AI试图代替主角说话，作为旁白保存
                await saveMessage(story._id, {
                  type: '旁白',
                  content: `[主角旁白] ${response.content}`,
                  timestamp: new Date()
                });
              } else {
                // 检查是否是新 NPC（不在预设角色列表中）
                const existingCharacterIndex = story.characters.findIndex(c => c.name === response.characterName);

                if (existingCharacterIndex === -1) {
                  // 这是一个新 NPC，登记到角色列表中
                  story.characters.push({
                    role: 'NPC',
                    historyId: null,
                    name: response.characterName
                  });
                  await story.save();
                }

                // 保存 NPC 对话
                await saveMessage(story._id, {
                  type: 'NPC',
                  characterName: response.characterName,
                  content: response.content,
                  timestamp: new Date()
                });
              }
            } else if (response.type === 'newCharacter') {
              // 处理新角色（包含完整角色数据）
              const charData = response.characterData;
              const charName = charData.name || '未知角色';

              // 检查是否已存在
              const existingCharacterIndex = story.characters.findIndex(c => c.name === charName);

              if (existingCharacterIndex === -1) {
                console.log(`[Message] 检测到新角色: ${charName}，保存完整数据到History`);

                // 构建角色数据对象
                const characterInfo = {
                  name: charData.name,
                  archetype: charData.archetype,
                  setting: charData.setting,
                  traits: Array.isArray(charData.traits) ? charData.traits : [charData.traits].filter(Boolean),
                  appearance: charData.appearance,
                  personality: charData.personality,
                  backstory: charData.backstory,
                  motivation: charData.motivation,
                  abilities: Array.isArray(charData.abilities) ? charData.abilities : [charData.abilities].filter(Boolean),
                  roleInStory: charData.roleInStory
                };

                // 生成角色图片（立绘 + 头像）
                // 注意：图片生成是耗时操作（可能需要 10-30 秒）
                // 我们在生成完成前不会发送完成信号给前端
                let portraitImage = null;
                let avatarImage = null;
                let portraitUrl = null;
                let avatarUrl = null;

                try {
                  const user = await User.findById(story.userId);
                  const doubaoConfig = user?.doubaoConfig || {};

                  // 使用默认配置（头像使用seedream-4.5，因为doubao-seededit-3.0-i2i已下线）
                  const imageConfig = {
                    apiKey: doubaoConfig.apiKey || '8111a62f-0f7c-42f2-ba06-3f52201ac62f',
                    baseUrl: doubaoConfig.baseUrl || 'https://ark.cn-beijing.volces.com/api/v3',
                    portraitModel: doubaoConfig.portraitModel || 'doubao-seedream-4-5-251128',
                    avatarModel: doubaoConfig.avatarModel || 'doubao-seedream-4-5-251128'
                  };

                  console.log(`[Message] 开始为新角色 ${charName} 生成图片...`);
                  const images = await generateAndDownloadImages(characterInfo, imageConfig);

                  portraitImage = images.portraitBase64;
                  avatarImage = images.avatarBase64;
                  portraitUrl = images.portraitUrl;
                  avatarUrl = images.avatarUrl;

                  console.log(`[Message] 新角色 ${charName} 图片生成完成`);
                } catch (imgError) {
                  console.error(`[Message] 生成新角色图片失败:`, imgError.message);
                  // 图片生成失败不影响角色保存
                }

                // 1. 保存到History数据库
                const newHistory = new History({
                  userId: story.userId,
                  toolType: 'character',
                  content: `角色：${charName}\n原型：${charData.archetype || '未知'}\n背景：${charData.setting || '未知'}\n特质：${Array.isArray(charData.traits) ? charData.traits.join(', ') : '未知'}\n外貌：${charData.appearance || '未知'}\n性格：${charData.personality || '未知'}\n背景故事：${charData.backstory || '未知'}\n动机：${charData.motivation || '未知'}\n能力：${Array.isArray(charData.abilities) ? charData.abilities.join(', ') : '未知'}\n在故事中的作用：${charData.roleInStory || '未知'}`,
                  inputParams: {
                    archetype: charData.archetype,
                    setting: charData.setting,
                    traits: Array.isArray(charData.traits) ? charData.traits.join(', ') : charData.traits
                  },
                  structuredData: {
                    character: characterInfo
                  },
                  isFavorite: false,
                  // 保存图片数据
                  portraitImage,
                  avatarImage,
                  portraitUrl,
                  avatarUrl
                });

                const savedHistory = await newHistory.save();
                console.log(`[Message] 新角色已保存到History，ID: ${savedHistory._id}`);

                // 2. 添加到故事的角色列表中（包含图片）
                story.characters.push({
                  role: 'NPC',
                  historyId: savedHistory._id,
                  name: charName,
                  archetype: charData.archetype,
                  setting: charData.setting,
                  traits: Array.isArray(charData.traits) ? charData.traits : [charData.traits].filter(Boolean),
                  appearance: charData.appearance,
                  personality: charData.personality,
                  backstory: charData.backstory,
                  motivation: charData.motivation,
                  abilities: Array.isArray(charData.abilities) ? charData.abilities : [charData.abilities].filter(Boolean),
                  roleInStory: charData.roleInStory,
                  // 保存图片数据
                  portraitImage,
                  avatarImage,
                  portraitUrl,
                  avatarUrl
                });
                await story.save();
              }

              // 如果有对话内容，保存为NPC对话
              if (response.content) {
                await saveMessage(story._id, {
                  type: 'NPC',
                  characterName: charName,
                  content: response.content,
                  timestamp: new Date()
                });
              }
            }
          }

          // 检查是否需要记忆压缩
          await checkAndCompressMemory(story._id, modelConfig);
        },
        null,  // onAllComplete - 不需要
        true   // waitForComplete: true - 等待onComplete执行完成后再发送完成信号
      );
    };

    await callAIWithRetry();

  } catch (error) {
    console.error('发送消息错误:', error);
    if (!res.headersSent) {
      // 检查错误类型，传递错误码
      const statusCode = error.response?.status;
      const errorCode = getErrorCode(statusCode);

      res.write(`data: ${JSON.stringify({
        error: error.message,
        errorCode: errorCode,
        statusCode: statusCode
      })}\n\n`);
      res.end();
    }
  }
});

/**
 * 根据HTTP状态码获取错误码
 * @param {number} statusCode - HTTP状态码
 * @returns {string} 错误码
 */
function getErrorCode(statusCode) {
  if (!statusCode) return 'UNKNOWN_ERROR';

  switch (statusCode) {
    case 400:
      return 'BAD_REQUEST';
    case 401:
      return 'UNAUTHORIZED';
    case 403:
      return 'FORBIDDEN';
    case 421:
      return 'MISDIRECTED_REQUEST';
    case 429:
      return 'RATE_LIMITED';
    case 500:
      return 'INTERNAL_SERVER_ERROR';
    case 503:
      return 'SERVICE_UNAVAILABLE';
    default:
      return 'UNKNOWN_ERROR';
  }
}

/**
 * POST /api/story/:id/error-state
 * 保存错误状态到数据库
 */
router.post('/:id/error-state', authenticateToken, async (req, res) => {
  try {
    const { message, errorCode, statusCode, userInput } = req.body;

    // 验证必填字段
    if (!message) {
      return res.status(400).json({ success: false, error: '缺少错误消息' });
    }

    // 获取故事
    const story = await Story.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!story) {
      return res.status(404).json({ success: false, error: '故事不存在' });
    }

    // 保存错误状态
    story.errorState = {
      hasError: true,
      message,
      errorCode: errorCode || 'UNKNOWN_ERROR',
      statusCode: statusCode || null,
      userInput: userInput || null,
      timestamp: new Date()
    };

    await story.save();

    res.json({
      success: true,
      message: '错误状态已保存'
    });

  } catch (error) {
    console.error('保存错误状态失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/story/:id/error-state
 * 从数据库获取错误状态
 */
router.get('/:id/error-state', authenticateToken, async (req, res) => {
  try {
    // 获取故事
    const story = await Story.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!story) {
      return res.status(404).json({ success: false, error: '故事不存在' });
    }

    res.json({
      success: true,
      errorState: story.errorState || null
    });

  } catch (error) {
    console.error('获取错误状态失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/story/:id/error-state
 * 清除错误状态
 */
router.delete('/:id/error-state', authenticateToken, async (req, res) => {
  try {
    // 获取故事
    const story = await Story.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!story) {
      return res.status(404).json({ success: false, error: '故事不存在' });
    }

    // 清除错误状态
    story.errorState = {
      hasError: false,
      message: null,
      errorCode: null,
      statusCode: null,
      userInput: null,
      timestamp: null
    };

    await story.save();

    res.json({
      success: true,
      message: '错误状态已清除'
    });

  } catch (error) {
    console.error('清除错误状态失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
