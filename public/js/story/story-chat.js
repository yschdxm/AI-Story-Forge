// 对话界面模块
// 作者: AI Story Forge
// 版本: 4.0

// 全局变量
let currentStoryId = null;  // 当前故事ID
let currentStoryData = null;  // 当前故事数据
let memoryPollingInterval = null;  // 记忆压缩轮询间隔
let memoryPollingTimeout = null;  // 记忆压缩轮询超时
let lastErrorState = null;  // 最后一次错误状态 { message, errorCode, statusCode, userInput, timestamp }

// ==================== 对话界面 ====================

/**
 * 进入故事
 */
async function enterStory(storyId) {
  const token = localStorage.getItem('token');
  if (!token) {
    showNotification('请先登录', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  try {
    const response = await fetch(`/api/story/${storyId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error);
    }

    currentStoryId = storyId;
    currentStoryData = result.story;

    // 切换到对话界面
    document.getElementById('story演绎-page').style.display = 'none';
    document.getElementById('story-chat-page').style.display = 'flex';

    // 隐藏顶栏和导航栏
    document.querySelector('.app-header').style.display = 'none';
    document.querySelector('.main-nav').style.display = 'none';

    // 更新标题
    document.getElementById('chat-story-name').textContent = result.story.name;

    // 渲染消息
    renderMessages(result.story.messages || []);

    // 更新消息计数
    updateMessageCount(result.story.messages?.length || 0);

    // 加载错误状态（持久化）- 必须在渲染消息之后调用
    // 因为 renderMessages 会清空容器
    setTimeout(async () => {
      await loadErrorStateFromStorage();
    }, 100);

    // 检查是否是首次进入（通过是否有首次进入标记判断）
    const isFirstEntry = !localStorage.getItem(`story_entered_${storyId}`);

    // 如果是首次进入且有角色，显示角色卡片
    if (isFirstEntry && result.story.characters && result.story.characters.length > 0) {
      // 标记为已进入
      localStorage.setItem(`story_entered_${storyId}`, 'true');

      setTimeout(() => {
        openRoleCardModal(result.story.characters, 0);
      }, 500);
    }

  } catch (error) {
    showNotification('加载失败: ' + error.message, 'error');
  }
}

/**
 * 返回故事列表
 */
function backToStoryList() {
  // 停止记忆压缩轮询
  if (memoryPollingInterval) {
    clearInterval(memoryPollingInterval);
    memoryPollingInterval = null;
  }
  if (memoryPollingTimeout) {
    clearTimeout(memoryPollingTimeout);
    memoryPollingTimeout = null;
  }

  // 注意：不在此处清除错误状态
  // 错误状态应该在用户点击重试按钮或消息发送成功后才清除
  // 这样可以保持错误状态，让用户在重新进入故事时仍然可以看到

  currentStoryId = null;
  currentStoryData = null;

  document.getElementById('story-chat-page').style.display = 'none';
  document.getElementById('story演绎-page').style.display = 'block';

  // 显示顶栏和导航栏
  document.querySelector('.app-header').style.display = 'block';
  document.querySelector('.main-nav').style.display = 'flex';

  // 清空聊天输入
  document.getElementById('chat-input').value = '';

  // 重新加载故事列表
  loadStoryList();
}

/**
 * 渲染消息列表
 */
function renderMessages(messages) {
  const container = document.getElementById('chat-messages');

  if (messages.length === 0) {
    container.innerHTML = '<p class="empty-tip">还没有消息，开始你的故事吧！</p>';
  } else {
    const html = messages.map(msg => {
      return renderMessage(msg);
    }).join('');

    container.innerHTML = html;
  }

  // 滚动到底部
  scrollToBottom();
}

/**
 * 渲染单条消息
 */
function renderMessage(message) {
  const time = new Date(message.timestamp || Date.now()).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit'
  });

  console.log('[Render] 渲染消息:', message.type, message.content?.substring(0, 50));

  // 旁白 - 不显示头部（角色名和时间）
  if (message.type === '旁白') {
    return `
      <div class="message message-旁白">
        <div class="message-content">${message.content}</div>
      </div>
    `;
  }

  let displayName = '';
  let characterIndex = undefined;  // 用于点击显示角色卡片
  let hasCharacterData = false;    // 是否有完整的角色数据

  if (message.type === '主角' && message.characterId !== undefined && currentStoryData) {
    const character = currentStoryData.characters[message.characterId];
    displayName = character?.name || '主角';
    characterIndex = message.characterId;
    hasCharacterData = !!character;
  } else if (message.type === 'NPC') {
    // 优先使用 characterId 查找
    if (message.characterId !== undefined && currentStoryData) {
      const npc = currentStoryData.characters[message.characterId];
      displayName = npc?.name || 'NPC';
      characterIndex = message.characterId;
      hasCharacterData = !!npc;
    } else if (message.characterName && currentStoryData) {
      // 使用 characterName 在角色列表中查找
      displayName = message.characterName;
      const foundIndex = currentStoryData.characters.findIndex(c => c.name === message.characterName);
      if (foundIndex !== -1) {
        characterIndex = foundIndex;
        const npc = currentStoryData.characters[foundIndex];
        hasCharacterData = !!npc;
      } else {
        hasCharacterData = false;
      }
    } else {
      displayName = 'NPC';
      hasCharacterData = false;
    }
  } else if (message.type === '记忆') {
    displayName = '记忆';
  } else {
    displayName = message.type;
  }

  // 判断是否可点击（有完整的角色数据）
  const isClickable = characterIndex !== undefined && hasCharacterData;
  const clickHandler = isClickable ? `onclick=\"showCharacterFromMessage(${characterIndex})\"` : '';
  const clickableClass = isClickable ? 'clickable' : '';
  const roleClass = `message-role ${clickableClass} ${isClickable ? '' : 'non-clickable'}`.trim();
  const avatarClass = `message-avatar ${clickableClass} ${isClickable ? '' : 'non-clickable'}`.trim();

  // 获取头像图片（优先使用Base64，其次URL，最后使用默认图标）
  let avatarContent = '👤';  // 默认图标

  if (characterIndex !== undefined && currentStoryData) {
    const character = currentStoryData.characters[characterIndex];
    if (character) {
      if (character.avatarImage) {
        // 使用Base64图片
        avatarContent = `<img src="data:image/jpeg;base64,${character.avatarImage}" alt="${displayName}" class="avatar-image">`;
      } else if (character.avatarUrl) {
        // 使用URL图片
        avatarContent = `<img src="${character.avatarUrl}" alt="${displayName}" class="avatar-image">`;
      } else {
        // 图片还在生成中，显示加载中图标
        avatarContent = '<span class="generating-avatar">⏳</span>';
      }
    }
  }

  return `
    <div class="message message-${message.type}">
      <div class="message-header">
        <span class="${avatarClass}" ${clickHandler}>${avatarContent}</span>
        <span class="${roleClass}" ${clickHandler}>${displayName}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-content">${message.content}</div>
    </div>
  `;
}

/**
 * 从消息中显示角色卡片
 */
function showCharacterFromMessage(characterIndex) {
  if (!currentStoryData || !currentStoryData.characters) return;

  const character = currentStoryData.characters[characterIndex];
  if (!character) return;

  // 只显示单个角色
  openRoleCardModal([character], 0);
}

/**
 * 更新最后一条消息（流式）
 */
function updateLastMessage(content) {
  const container = document.getElementById('chat-messages');
  const messages = container.querySelectorAll('.message');

  // 尝试解析JSON，如果失败则显示原始内容
  let displayContent = content;
  let displayType = 'NPC';

  // 尝试从响应中提取JSON
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const responseData = JSON.parse(jsonMatch[1]);
      if (responseData.responses && responseData.responses.length > 0) {
        // 显示第一条响应的内容
        const firstResponse = responseData.responses[0];
        displayType = firstResponse.type;
        displayContent = firstResponse.content;
      }
    } catch (e) {
      // JSON解析失败，显示原始内容
    }
  }

  if (messages.length === 0) {
    // 创建新消息
    const tempMessage = {
      type: displayType,
      content: displayContent,
      timestamp: new Date()
    };
    container.innerHTML += renderMessage(tempMessage);
  } else {
    // 更新最后一条消息
    const lastMessage = messages[messages.length - 1];
    const contentDiv = lastMessage.querySelector('.message-content');
    if (contentDiv) {
      contentDiv.textContent = displayContent;
    }
  }

  scrollToBottom();
}

/**
 * 更新消息计数
 */
function updateMessageCount(count) {
  document.getElementById('chat-message-count').textContent = `${count} 条消息`;
}

/**
 * 滚动到底部
 */
function scrollToBottom() {
  const container = document.getElementById('chat-messages');
  container.scrollTop = container.scrollHeight;
}

/**
 * 显示按钮加载状态
 */
function showButtonLoading() {
  const sendBtn = document.querySelector('#story-chat-page .generate-btn');
  const chatInput = document.getElementById('chat-input');

  if (sendBtn) {
    sendBtn.dataset.originalText = sendBtn.textContent;
    sendBtn.innerHTML = `
      <span class="btn-loading-indicator">
        <span class="btn-loading-dot"></span>
        <span class="btn-loading-dot"></span>
        <span class="btn-loading-dot"></span>
      </span>
    `;
    sendBtn.disabled = true;
    sendBtn.classList.add('loading');
  }

  if (chatInput) {
    chatInput.disabled = true;
  }
}

/**
 * 隐藏按钮加载状态
 */
function hideButtonLoading() {
  const sendBtn = document.querySelector('#story-chat-page .generate-btn');
  const chatInput = document.getElementById('chat-input');

  if (sendBtn) {
    sendBtn.textContent = sendBtn.dataset.originalText || '发送';
    sendBtn.disabled = false;
    sendBtn.classList.remove('loading');
  }

  if (chatInput) {
    chatInput.disabled = false;
  }
}

/**
 * 发送消息
 */
async function sendMessage() {
  if (!currentStoryId) {
    showNotification('请先选择一个故事', 'error');
    return;
  }

  const content = document.getElementById('chat-input').value.trim();

  if (!content) {
    showNotification('请输入消息', 'error');
    return;
  }

  // 记录当前角色数量（用于检测是否新增角色）
  const previousCharacterCount = currentStoryData?.characters?.length || 0;

  // 渲染用户消息（作为主角）
  const mainCharacterIndex = currentStoryData.characters.findIndex(c => c.role === '主角');
  const userMessage = {
    type: '主角',
    characterId: mainCharacterIndex !== -1 ? mainCharacterIndex : undefined,
    content: content,
    timestamp: new Date()
  };

  const container = document.getElementById('chat-messages');
  container.innerHTML += renderMessage(userMessage);
  document.getElementById('chat-input').value = '';
  scrollToBottom();

  // 更新消息计数
  const currentCount = parseInt(document.getElementById('chat-message-count').textContent) || 0;
  updateMessageCount(currentCount + 1);

  // 显示按钮加载状态（禁用输入和按钮）
  showButtonLoading();

  // 使用非流式调用（避免看到JSON原始数据）
  // 注意：后端会在保存消息到数据库后才发送完成信号
  // 所以前端收到完成信号时，消息已经保存到数据库
  sendMessageNonStream(
    currentStoryId,
    { content },
    async (finalContent) => {
      // onComplete - 图片生成已完成
      console.log('[Story] onComplete回调被调用，finalContent长度:', finalContent.length);
      hideButtonLoading();

      // 重新加载消息以获取最新的消息列表
      // 传递 previousCharacterCount 以便检测新角色并显示角色卡片
      await refreshMessages(previousCharacterCount);

      // 消息发送成功，清除错误状态
      await clearErrorState();

      // 轮询检查记忆压缩是否完成（消息数是否变化）
      startMemoryCompressionPolling();
    },
    async (error, errorCode, statusCode) => {
      // onError
      hideButtonLoading();

      // 判断错误类型
      await handleSendMessageError(error, errorCode, statusCode, content);
    }
  );
}

/**
 * 处理发送消息的错误
 */
async function handleSendMessageError(error, errorCode, statusCode, userInput) {
  // 检查是否是需要重试的错误（从utils.js获取配置）
  const retryableCodes = window.RETRYABLE_ERROR_CODES || ['BAD_REQUEST', 'RATE_LIMITED', 'INTERNAL_SERVER_ERROR', 'SERVICE_UNAVAILABLE', 'UNKNOWN_ERROR'];
  const isRetryable = !errorCode || retryableCodes.includes(errorCode);

  if (isRetryable) {
    // 可重试的错误：显示错误信息，但不保存错误状态
    showNotification('发送失败: ' + error, 'error');
    console.log(`[Error] 可重试错误: ${error}, 错误码: ${errorCode}, 状态码: ${statusCode}`);
  } else {
    // 不可重试的错误：保存错误状态，显示重试按钮
    lastErrorState = {
      message: error,
      errorCode: errorCode,
      statusCode: statusCode,
      userInput: userInput,
      timestamp: new Date().toISOString()
    };

    // 持久化到数据库（等待保存完成）
    await saveErrorStateToStorage();

    // 显示错误消息
    showNotification('发生错误: ' + error, 'error');

    // 在消息区域显示错误状态
    displayErrorInChat(error, errorCode);

    console.log(`[Error] 不可重试错误: ${error}, 错误码: ${errorCode}, 状态码: ${statusCode}`);
  }
}

/**
 * 保存错误状态到数据库
 */
async function saveErrorStateToStorage() {
  if (!currentStoryId || !lastErrorState) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/story/${currentStoryId}/error-state`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        message: lastErrorState.message,
        errorCode: lastErrorState.errorCode,
        statusCode: lastErrorState.statusCode,
        userInput: lastErrorState.userInput
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('[Error] 错误状态已保存到数据库');
    } else {
      console.error('[Error] 保存错误状态失败:', result.error);
    }
  } catch (error) {
    console.error('[Error] 保存错误状态失败:', error.message);
  }
}

/**
 * 从数据库加载错误状态
 */
async function loadErrorStateFromStorage() {
  if (!currentStoryId) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/story/${currentStoryId}/error-state`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    console.log('[Error] 尝试从数据库加载错误状态:', result);

    if (result.success && result.errorState && result.errorState.hasError) {
      lastErrorState = {
        message: result.errorState.message,
        errorCode: result.errorState.errorCode,
        statusCode: result.errorState.statusCode,
        userInput: result.errorState.userInput,
        timestamp: result.errorState.timestamp
      };

      displayErrorInChat(lastErrorState.message, lastErrorState.errorCode);
      console.log('[Error] 错误状态已加载并显示');
    } else {
      console.log('[Error] 没有找到该故事的错误状态');
    }
  } catch (error) {
    console.error('[Error] 加载错误状态失败:', error.message);
  }
}

/**
 * 清除错误状态（从数据库）
 */
async function clearErrorState() {
  lastErrorState = null;

  // 移除错误消息显示
  const errorElement = document.getElementById('chat-error-message');
  if (errorElement) {
    errorElement.remove();
  }

  if (!currentStoryId) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/story/${currentStoryId}/error-state`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (result.success) {
      console.log('[Error] 错误状态已从数据库清除');
    } else {
      console.error('[Error] 清除错误状态失败:', result.error);
    }
  } catch (error) {
    console.error('[Error] 清除错误状态失败:', error.message);
  }
}

/**
 * 在聊天区域显示错误
 */
function displayErrorInChat(errorMessage, errorCode) {
  const container = document.getElementById('chat-messages');

  if (!container) {
    console.error('[Error] 无法找到聊天消息容器');
    return;
  }

  // 移除现有的错误消息
  const existingError = document.getElementById('chat-error-message');
  if (existingError) {
    existingError.remove();
  }

  // 创建错误消息元素
  const errorDiv = document.createElement('div');
  errorDiv.id = 'chat-error-message';
  errorDiv.className = 'chat-error-message';

  // 从window对象获取错误码配置（避免重复声明问题）
  const retryableCodes = window.RETRYABLE_ERROR_CODES || ['BAD_REQUEST', 'RATE_LIMITED', 'INTERNAL_SERVER_ERROR', 'SERVICE_UNAVAILABLE', 'UNKNOWN_ERROR'];
  const isRetryable = !errorCode || retryableCodes.includes(errorCode);

  if (isRetryable) {
    // 可重试的错误 - 显示重试按钮
    errorDiv.innerHTML = `
      <div class="error-content">
        <div class="error-icon">⚠️</div>
        <div class="error-text">
          <strong>请求失败</strong>
          <p>${errorMessage}</p>
          <small>错误码: ${errorCode || 'UNKNOWN'}</small>
        </div>
      </div>
      <button class="btn-retry" onclick="retryLastMessage()">🔄 重试</button>
    `;
  } else {
    // 不可重试的错误 - 显示重试按钮
    errorDiv.innerHTML = `
      <div class="error-content">
        <div class="error-icon">❌</div>
        <div class="error-text">
          <strong>发生错误</strong>
          <p>${errorMessage}</p>
          <small>错误码: ${errorCode || 'UNKNOWN'}</small>
        </div>
      </div>
      <button class="btn-retry" onclick="retryLastMessage()">🔄 重试</button>
    `;
  }

  container.appendChild(errorDiv);
  scrollToBottom();
}

/**
 * 重试上一条消息
 */
async function retryLastMessage() {
  if (!lastErrorState || !lastErrorState.userInput) {
    showNotification('没有可重试的消息', 'error');
    return;
  }

  // 保存用户输入
  const userInput = lastErrorState.userInput;

  // 清除错误状态（在重试前）
  await clearErrorState();

  // 恢复用户输入
  document.getElementById('chat-input').value = userInput;

  // 显示重试提示
  showNotification('正在重试...', 'info');

  // 发送消息
  await sendMessage();
}

/**
 * 刷新消息
 * @param {number} previousCharacterCount - 刷新前的角色数量（可选，用于检测新角色）
 */
async function refreshMessages(previousCharacterCount) {
  if (!currentStoryId) return;

  const token = localStorage.getItem('token');

  // 如果没有提供 previousCharacterCount，使用当前的值
  if (previousCharacterCount === undefined) {
    previousCharacterCount = currentStoryData?.characters?.length || 0;
  }

  const response = await fetch(`/api/story/${currentStoryId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();

  if (result.success) {
    currentStoryData = result.story;
    console.log('[Story] 刷新消息，消息数量:', result.story.messages?.length || 0);
    console.log('[Story] 消息列表:', result.story.messages);
    renderMessages(result.story.messages || []);
    updateMessageCount(result.story.messages?.length || 0);

    // 重新加载错误状态（renderMessages会清空容器）
    // 使用setTimeout确保DOM更新完成
    setTimeout(async () => {
      await loadErrorStateFromStorage();
    }, 50);

    // 检查是否有新角色被创建
    const newCharacterCount = result.story.characters?.length || 0;
    if (newCharacterCount > previousCharacterCount) {
      // 找出新创建的角色
      const newCharacters = result.story.characters.slice(previousCharacterCount);

      // 显示新角色的卡片（无论是否是第一次添加角色）
      setTimeout(() => {
        openRoleCardModal(newCharacters, 0);
      }, 500);
    }
  }
}

/**
 * 开始轮询检查记忆压缩是否完成
 */
function startMemoryCompressionPolling() {
  // 如果没有当前故事ID，不启动轮询
  if (!currentStoryId) {
    return;
  }

  // 清除之前的轮询
  if (memoryPollingInterval) {
    clearInterval(memoryPollingInterval);
  }
  if (memoryPollingTimeout) {
    clearTimeout(memoryPollingTimeout);
  }

  const token = localStorage.getItem('token');
  let initialMessageCount = currentStoryData?.messages?.length || 0;
  let checkCount = 0;
  const maxChecks = 15; // 最多检查15次（15秒）

  memoryPollingInterval = setInterval(async () => {
    // 检查是否已经退出故事页面
    if (!currentStoryId) {
      clearInterval(memoryPollingInterval);
      return;
    }

    checkCount++;

    if (checkCount > maxChecks) {
      clearInterval(memoryPollingInterval);
      return;
    }

    try {
      const response = await fetch(`/api/story/${currentStoryId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        const currentMessageCount = result.story.messages?.length || 0;

        // 检查消息数是否减少（记忆压缩会减少消息数，正常回复会增加）
        if (currentMessageCount < initialMessageCount) {
          // 更新显示
          currentStoryData = result.story;
          renderMessages(result.story.messages || []);
          updateMessageCount(currentMessageCount);

          // 重新加载错误状态（renderMessages会清空容器）
          // 使用setTimeout确保DOM更新完成
          setTimeout(async () => {
            await loadErrorStateFromStorage();
          }, 50);

          // 停止轮询
          clearInterval(memoryPollingInterval);
        } else if (currentMessageCount > initialMessageCount) {
          // 更新初始消息数，继续轮询等待可能的压缩
          initialMessageCount = currentMessageCount;
        }
      }
    } catch (error) {
      clearInterval(memoryPollingInterval);
    }
  }, 1000); // 每秒检查一次

  // 15秒后自动停止轮询
  memoryPollingTimeout = setTimeout(() => {
    clearInterval(memoryPollingInterval);
  }, 15000);
}
