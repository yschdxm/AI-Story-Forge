// 对话界面模块
// 作者: AI Story Forge
// 版本: 4.0

// 全局变量
let currentStoryId = null;  // 当前故事ID
let currentStoryData = null;  // 当前故事数据
let memoryPollingInterval = null;  // 记忆压缩轮询间隔
let memoryPollingTimeout = null;  // 记忆压缩轮询超时

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
    return;
  }

  const html = messages.map(msg => {
    return renderMessage(msg);
  }).join('');

  container.innerHTML = html;

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
  const clickHandler = isClickable ? `onclick="showCharacterFromMessage(${characterIndex})"` : '';
  const clickableClass = isClickable ? 'clickable' : '';
  const roleClass = `message-role ${clickableClass} ${isClickable ? '' : 'non-clickable'}`.trim();
  const avatarClass = `message-avatar ${clickableClass} ${isClickable ? '' : 'non-clickable'}`.trim();

  return `
    <div class="message message-${message.type}">
      <div class="message-header">
        <span class="${avatarClass}" ${clickHandler}>👤</span>
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
  sendMessageNonStream(
    currentStoryId,
    { content },
    async (finalContent) => {
      // onComplete
      hideButtonLoading();
      showNotification('发送成功', 'success');

      // 等待一小段时间，确保后端完成消息保存
      await new Promise(resolve => setTimeout(resolve, 500));

      // 重新加载消息以获取最新的消息列表
      await refreshMessages();

      // 轮询检查记忆压缩是否完成（消息数是否变化）
      startMemoryCompressionPolling();
    },
    (error) => {
      // onError
      hideButtonLoading();
      showNotification('发送失败: ' + error, 'error');
    }
  );
}

/**
 * 刷新消息
 */
async function refreshMessages() {
  if (!currentStoryId) return;

  const token = localStorage.getItem('token');

  // 记录刷新前的角色数量
  const previousCharacterCount = currentStoryData?.characters?.length || 0;

  const response = await fetch(`/api/story/${currentStoryId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const result = await response.json();

  if (result.success) {
    currentStoryData = result.story;
    renderMessages(result.story.messages || []);
    updateMessageCount(result.story.messages?.length || 0);

    // 检查是否有新角色被创建
    const newCharacterCount = result.story.characters?.length || 0;
    if (newCharacterCount > previousCharacterCount && previousCharacterCount > 0) {
      // 找出新创建的角色
      const newCharacters = result.story.characters.slice(previousCharacterCount);
      // 显示新角色的卡片
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
