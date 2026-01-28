// 故事演绎功能
// 作者: AI Story Forge
// 版本: 4.0

let currentStoryId = null;  // 当前故事ID
let currentStoryData = null;  // 当前故事数据

// ==================== 故事列表管理 ====================

/**
 * 加载故事列表
 * @param {boolean} showLoadingIndicator - 是否显示加载状态（默认 true）
 */
async function loadStoryList(showLoadingIndicator = true) {
  const token = localStorage.getItem('token');
  if (!token) {
    showNotification('请先登录', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  if (showLoadingIndicator) {
    showLoading(true, 'ai-creating');
  }

  try {
    const response = await fetch('/api/story/list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    console.log('[story] 加载故事列表结果:', result);

    if (!result.success) {
      throw new Error(result.error);
    }

    if (showLoadingIndicator) {
      hideLoading();
    }

    const stories = result.stories || [];
    const listContainer = document.getElementById('story-list');
    const emptyContainer = document.getElementById('story-empty');

    console.log('[story] 故事数量:', stories.length);

    if (stories.length === 0) {
      listContainer.innerHTML = '';
      emptyContainer.style.display = 'block';
      return;
    }

    emptyContainer.style.display = 'none';
    // 只有首次加载（显示加载状态）时才播放动画
    renderStoryList(stories, showLoadingIndicator);

  } catch (error) {
    if (showLoadingIndicator) {
      hideLoading();
    }
    console.error('[story] 加载失败:', error);
    showNotification('加载失败: ' + error.message, 'error');
  }
}

/**
 * 渲染故事列表
 * @param {Array} stories - 故事列表
 * @param {boolean} animate - 是否播放动画（默认 false，不播放）
 */
function renderStoryList(stories, animate = false) {
  const container = document.getElementById('story-list');

  const html = stories.map(story => {
    const characterNames = story.characters.map(c => c.name || '未知').join(', ');
    // 处理 keywords（可能是数组或字符串）
    let preview = '暂无情节描述';
    if (story.plot.keywords) {
      if (Array.isArray(story.plot.keywords)) {
        preview = story.plot.keywords.join(', ');
      } else {
        preview = story.plot.keywords;
      }
    }

    return `
      <div class="story-card" data-id="${story.id}">
        <div class="story-card-header">
          <div class="story-card-title">${story.name}</div>
        </div>
        <div class="story-card-info">
          👥 ${story.characters.length}个角色: ${characterNames}
        </div>
        <div class="story-card-preview">
          📖 ${preview}
        </div>
        <div class="story-card-info">
          💬 ${story.totalMessages || 0} 条消息
          ${story.lastMessageAt ? `<br>🕐 ${new Date(story.lastMessageAt).toLocaleString('zh-CN')}` : ''}
        </div>
        <div class="story-card-actions">
          <button class="btn-small btn-enter" onclick="enterStory('${story.id}')">进入故事</button>
          <button class="btn-small btn-danger" onclick="deleteStory('${story.id}')">删除</button>
        </div>
      </div>
    `;
  }).join('');

  // 禁用动画后更新（避免刷新时重复播放动画）
  container.style.animation = 'none';
  container.innerHTML = html;
  container.offsetHeight; // 强制重绘
  container.style.animation = '';
}

/**
 * 搜索故事
 */
async function searchStories(keyword) {
  const token = localStorage.getItem('token');
  if (!token) return;

  showLoading(true, 'ai-creating');

  try {
    const response = await fetch('/api/story/list', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error);
    }

    hideLoading();

    let stories = result.stories;

    if (keyword) {
      const lowerKeyword = keyword.toLowerCase();
      stories = stories.filter(story =>
        story.name.toLowerCase().includes(lowerKeyword) ||
        story.characters.some(c => (c.name || '').toLowerCase().includes(lowerKeyword)) ||
        (story.plot.keywords || '').toLowerCase().includes(lowerKeyword)
      );
    }

    const listContainer = document.getElementById('story-list');
    const emptyContainer = document.getElementById('story-empty');

    if (stories.length === 0) {
      listContainer.innerHTML = '<p class="empty-tip">没有找到匹配的故事</p>';
      emptyContainer.style.display = 'none';
      return;
    }

    emptyContainer.style.display = 'none';
    renderStoryList(stories);

  } catch (error) {
    hideLoading();
    showNotification('搜索失败: ' + error.message, 'error');
  }
}

/**
 * 删除单个故事
 */
async function deleteStory(storyId) {
  if (!confirm('确定要删除这个故事吗？')) return;

  const token = localStorage.getItem('token');
  if (!token) return;

  showLoading(true, 'ai-creating');

  try {
    const response = await fetch(`/api/story/${storyId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error);
    }

    hideLoading();
    showNotification('故事已删除', 'success');
    loadStoryList();

  } catch (error) {
    hideLoading();
    showNotification('删除失败: ' + error.message, 'error');
  }
}

/**
 * 删除所有故事
 */
async function deleteAllStories() {
  if (!confirm('确定要删除所有故事吗？此操作不可恢复。')) return;

  const token = localStorage.getItem('token');
  if (!token) return;

  showLoading(true, 'ai-creating');

  try {
    const response = await fetch('/api/story', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error);
    }

    hideLoading();
    showNotification(result.message, 'success');
    loadStoryList();

  } catch (error) {
    hideLoading();
    showNotification('删除失败: ' + error.message, 'error');
  }
}

// ==================== 创建故事模态框 ====================

/**
 * 打开创建故事模态框
 */
async function openCreateStoryModal() {
  const token = localStorage.getItem('token');
  if (!token) {
    showNotification('请先登录', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  // 显示模态框
  const modal = document.getElementById('create-story-modal');
  modal.style.display = 'flex';

  // 加载历史记录选项（这会设置 window._storyCharactersData）
  await loadHistoryOptions();

  // 初始更新角色选择器
  updateCharacterSections();

  // 初始化角色数量变化监听（只添加一次）
  const characterCountInput = document.getElementById('character-count');
  // 移除旧的监听器（如果有）
  characterCountInput.removeEventListener('change', updateCharacterSections);
  // 添加新的监听器
  characterCountInput.addEventListener('change', updateCharacterSections);

  // 初始化表单提交（只添加一次）
  const form = document.getElementById('create-story-form');
  // 移除旧的监听器
  form.onsubmit = null;
  // 添加新的监听器
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await submitCreateStory();
  });
}

/**
 * 关闭创建故事模态框
 */
function closeCreateStoryModal() {
  const modal = document.getElementById('create-story-modal');
  modal.style.display = 'none';

  // 清空表单
  document.getElementById('create-story-form').reset();
  document.getElementById('character-sections').innerHTML = '';
}

/**
 * 加载历史记录选项
 */
async function loadHistoryOptions() {
  const token = localStorage.getItem('token');
  const response = await fetch('/api/history/list', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  const histories = data.histories || [];

  // 筛选不同类型的记录
  const characters = histories.filter(h => h.toolType === 'character');
  const plots = histories.filter(h => h.toolType === 'plot');
  const worlds = histories.filter(h => h.toolType === 'world');

  // 存储角色数据供后续使用
  window._storyCharactersData = characters;

  // 填充情节下拉菜单
  const plotOptions = document.getElementById('plot-options');
  const plotSelect = document.getElementById('plot-select');
  if (plotOptions && plotSelect) {
    const plotHtml = plots.map(h => {
      const id = h._id || h.id;
      // 优先使用结构化数据中的标题，回退到输入参数，最后使用内容截取
      const title = h.structuredData?.plot?.title || h.inputParams?.keywords || h.content.substring(0, 30);
      return `<div class="custom-select-option" data-value="${id}">📖 ${title}</div>`;
    }).join('');
    plotOptions.innerHTML = `<div class="custom-select-option" data-value="auto">🎭 自动生成</div>` + plotHtml;

    // 更新原生select元素
    const plotSelectHtml = `<option value="">选择情节</option><option value="auto">🎭 自动生成</option>` +
      plots.map(h => {
        const id = h._id || h.id;
        const title = h.structuredData?.plot?.title || h.inputParams?.keywords || '情节';
        return `<option value="${id}">📖 ${title}</option>`;
      }).join('');
    plotSelect.innerHTML = plotSelectHtml;
  }

  // 填充世界观下拉菜单
  const worldOptions = document.getElementById('world-options');
  const worldSelect = document.getElementById('world-select');
  if (worldOptions && worldSelect) {
    const worldHtml = worlds.map(h => {
      const id = h._id || h.id;
      // 优先使用结构化数据中的名称，回退到输入参数，最后使用内容截取
      const name = h.structuredData?.world?.worldName || h.inputParams?.era || h.content.substring(0, 30);
      return `<div class="custom-select-option" data-value="${id}">🌍 ${name}</div>`;
    }).join('');
    worldOptions.innerHTML = `<div class="custom-select-option" data-value="auto">🌍 自动生成</div>` + worldHtml;

    // 更新原生select元素
    const worldSelectHtml = `<option value="">选择世界观</option><option value="auto">🌍 自动生成</option>` +
      worlds.map(h => {
        const id = h._id || h.id;
        const name = h.structuredData?.world?.worldName || h.inputParams?.era || '世界观';
        return `<option value="${id}">🌍 ${name}</option>`;
      }).join('');
    worldSelect.innerHTML = worldSelectHtml;
  }

  // 重新初始化下拉菜单
  initCustomSelects();
}

/**
 * 更新角色选择器区域
 */
function updateCharacterSections() {
  const count = parseInt(document.getElementById('character-count').value) || 1;
  const container = document.getElementById('character-sections');
  const characters = window._storyCharactersData || [];

  let html = '';

  for (let i = 0; i < count; i++) {
    const isMain = i === 0;
    const role = isMain ? '主角' : 'NPC';
    const selectId = `character-select-${i}`;

    // 生成角色选项
    let optionsHtml = '';
    let selectHtml = `<option value="">选择${role}角色</option><option value="auto">🎭 自动生成</option>`;

    if (characters.length > 0) {
      optionsHtml = characters.map(h => {
        const id = h._id || h.id;  // 兼容 _id 和 id
        // 优先使用结构化数据中的名称，回退到输入参数，最后使用内容截取
        const name = h.structuredData?.character?.name || h.inputParams?.archetype || h.content.substring(0, 30);
        return `<div class="custom-select-option" data-value="${id}">🎭 ${name}</div>`;
      }).join('');

      selectHtml += characters.map(h => {
        const id = h._id || h.id;  // 兼容 _id 和 id
        const name = h.structuredData?.character?.name || h.inputParams?.archetype || '角色';
        return `<option value="${id}">🎭 ${name}</option>`;
      }).join('');
    }

    html += `
      <div class="input-group">
        <label>${role} ${i + 1}</label>
        <div class="custom-select" data-select="${selectId}">
          <div class="custom-select-trigger">
            <span class="custom-select-value">选择${role}角色</span>
            <svg class="custom-select-arrow" viewBox="0 0 24 24" fill="none" stroke="#f687b3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </div>
          <div class="custom-select-options" id="${selectId}-options">
            <div class="custom-select-option" data-value="auto">🎭 自动生成</div>
            ${optionsHtml}
          </div>
          <select id="${selectId}" style="display: none;">
            ${selectHtml}
          </select>
        </div>
      </div>
    `;
  }

  container.innerHTML = html;

  // 重新初始化下拉菜单
  setTimeout(() => {
    initCustomSelects();
  }, 10);
}

/**
 * 提交创建故事
 */
async function submitCreateStory() {
  const token = localStorage.getItem('token');
  if (!token) {
    showNotification('请先登录', 'error');
    return;
  }

  // 获取基本信息
  const name = document.getElementById('story-name').value.trim();
  const characterCount = parseInt(document.getElementById('character-count').value);

  if (!name) {
    showNotification('请输入故事名称', 'error');
    return;
  }

  // 获取角色选择
  const characters = [];
  for (let i = 0; i < characterCount; i++) {
    const selectId = `character-select-${i}`;
    const value = getCustomSelectValue(selectId);

    console.log(`角色 ${i} (${selectId}):`, value);

    if (!value) {
      showNotification(`请选择${i === 0 ? '主角' : 'NPC'} ${i + 1}`, 'error');
      return;
    }

    // 如果是自动生成，创建一个虚拟的historyId
    if (value === 'auto') {
      characters.push({
        role: i === 0 ? '主角' : 'NPC',
        historyId: 'auto',  // 特殊标记
        autoGenerate: true
      });
    } else {
      characters.push({
        role: i === 0 ? '主角' : 'NPC',
        historyId: value
      });
    }
  }

  // 获取情节选择
  const plotValue = getCustomSelectValue('plot-select');
  console.log('情节选择 (plot-select):', plotValue);

  if (!plotValue) {
    showNotification('请选择故事情节', 'error');
    return;
  }

  // 获取世界观选择
  const worldValue = getCustomSelectValue('world-select');
  console.log('世界观选择 (world-select):', worldValue);

  if (!worldValue) {
    showNotification('请选择世界观', 'error');
    return;
  }

  // 构建请求数据
  const requestData = {
    name,
    characters: characters.map(c => ({
      role: c.role,
      historyId: c.historyId === 'auto' ? null : c.historyId
    })),
    plot: { historyId: plotValue === 'auto' ? null : plotValue },
    world: { historyId: worldValue === 'auto' ? null : worldValue }
  };

  // 添加模型配置
  const modelConfig = getCurrentModel();
  if (modelConfig) {
    requestData.modelConfig = modelConfig;
  }

  console.log('请求数据:', requestData);

  showLoading(true, 'ai-creating');

  try {
    const response = await fetch('/api/story/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(requestData)
    });

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error);
    }

    hideLoading();
    showNotification('故事创建成功！', 'success');
    closeCreateStoryModal();
    loadStoryList();

  } catch (error) {
    hideLoading();
    showNotification('创建失败: ' + error.message, 'error');
  }
}

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

  if (message.type === '主角' && message.characterId !== undefined && currentStoryData) {
    const character = currentStoryData.characters[message.characterId];
    displayName = character?.name || '主角';
  } else if (message.type === 'NPC') {
    // 优先使用 characterId 查找，如果没有则使用 characterName
    if (message.characterId !== undefined && currentStoryData) {
      const npc = currentStoryData.characters[message.characterId];
      displayName = npc?.name || 'NPC';
    } else if (message.characterName) {
      displayName = message.characterName;  // 直接使用 AI 提供的名称
    } else {
      displayName = 'NPC';
    }
  } else if (message.type === '记忆') {
    displayName = '记忆';
  } else {
    displayName = message.type;
  }

  return `
    <div class="message message-${message.type}">
      <div class="message-header">
        <span class="message-role">${displayName}</span>
        <span class="message-time">${time}</span>
      </div>
      <div class="message-content">${message.content}</div>
    </div>
  `;
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
  }
}

/**
 * 开始轮询检查记忆压缩是否完成
 */
let memoryPollingInterval = null;
let memoryPollingTimeout = null;

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

// ==================== 页面初始化 ====================

// 页面加载时自动加载故事列表
document.addEventListener('DOMContentLoaded', function() {
  // 检查是否在故事演绎页面
  const storyPage = document.getElementById('story演绎-page');
  if (storyPage && storyPage.classList.contains('active')) {
    loadStoryList();
  }

  // 搜索框监听
  const searchInput = document.getElementById('story-search');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchStories(this.value);
      }, 300);
    });
  }

  // 聊天输入框回车发送消息
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', function(e) {
      // 回车键发送（Shift+回车换行）
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
});
