const express = require('express');
const router = express.Router();
const History = require('../../models/History');
const Story = require('../../models/Story');
const { authenticateToken } = require('../../middleware/auth');
const { callAIStream, getModelConfigFromRequest } = require('../../services/aiService');
const { buildSystemPrompt, buildUserPrompt, parseAIResponse, saveMessage } = require('./story-utils');

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
            throw new Error(`JSON解析失败，已重试${maxRetries}次: ${parseResult.error}`);
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
                    character: {
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
                    }
                  },
                  isFavorite: false
                });

                const savedHistory = await newHistory.save();
                console.log(`[Message] 新角色已保存到History，ID: ${savedHistory._id}`);

                // 2. 添加到故事的角色列表中
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
                  roleInStory: charData.roleInStory
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
        }
      );
    };

    await callAIWithRetry();

  } catch (error) {
    console.error('发送消息错误:', error);
    if (!res.headersSent) {
      res.json({ success: false, error: error.message });
    }
  }
});

module.exports = router;
