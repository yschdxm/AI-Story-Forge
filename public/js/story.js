// 故事演绎功能
// 作者: AI Story Forge
// 版本: 4.0

let currentStoryId = null;  // 当前故事ID
let currentStoryData = null;  // 当前故事数据

// ==================== 故事列表管理 ====================

/**
 * 加载故事列表
 */
async function loadStoryList() {
  const token = localStorage.getItem('token');
  if (!token) {
    showNotification('请先登录', 'error');
    setTimeout(() => window.location.href = 'login.html', 1500);
    return;
  }

  showLoading();

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

    const stories = result.stories;
    const listContainer = document.getElementById('story-list');
    const emptyContainer = document.getElementById('story-empty');

    if (stories.length === 0) {
      listContainer.innerHTML = '';
      emptyContainer.style.display = 'block';
      return;
    }

    emptyContainer.style.display = 'none';
    renderStoryList(stories);

  } catch (error) {
    hideLoading();
    showNotification('加载失败: ' + error.message, 'error');
  }
}

/**
 * 渲染故事列表
 */
function renderStoryList(stories) {
  const container = document.getElementById('story-list');

  const html = stories.map(story => {
    const characterNames = story.characters.map(c => c.name || '未知').join(', ');
    const preview = story.plot.keywords || '暂无情节描述';

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

  container.innerHTML = html;
}

/**
 * 搜索故事
 */
async function searchStories(keyword) {
  const token = localStorage.getItem('token');
  if (!token) return;

  showLoading();

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

  showLoading();

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

  showLoading();

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

  console.log('[story] 加载的历史记录:', histories);

  // 筛选不同类型的记录
  const characters = histories.filter(h => h.toolType === 'character');
  const plots = histories.filter(h => h.toolType === 'plot');
  const worlds = histories.filter(h => h.toolType === 'world');

  console.log('[story] 角色记录:', characters);
  console.log('[story] 情节记录:', plots);
  console.log('[story] 世界观记录:', worlds);

  // 填充情节下拉菜单
  const plotOptions = document.getElementById('plot-options');
  const plotSelect = document.getElementById('plot-select');
  if (plotOptions && plotSelect) {
    const plotHtml = plots.map(h => {
      const preview = h.inputParams?.keywords || h.content.substring(0, 50);
      const id = h._id || h.id;
      return `<div class="custom-select-option" data-value="${id}">📖 ${preview}...</div>`;
    }).join('');
    plotOptions.innerHTML = `<div class="custom-select-option" data-value="auto">🎭 自动生成</div>` + plotHtml;

    // 更新原生select元素
    const plotSelectHtml = `<option value="">选择情节</option><option value="auto">🎭 自动生成</option>` +
      plots.map(h => {
        const id = h._id || h.id;
        return `<option value="${id}">📖 ${h.inputParams?.keywords || '情节'}</option>`;
      }).join('');
    plotSelect.innerHTML = plotSelectHtml;
  }

  // 填充世界观下拉菜单
  const worldOptions = document.getElementById('world-options');
  const worldSelect = document.getElementById('world-select');
  if (worldOptions && worldSelect) {
    const worldHtml = worlds.map(h => {
      const preview = h.inputParams?.era || h.content.substring(0, 50);
      const id = h._id || h.id;
      return `<div class="custom-select-option" data-value="${id}">🌍 ${preview}...</div>`;
    }).join('');
    worldOptions.innerHTML = `<div class="custom-select-option" data-value="auto">🌍 自动生成</div>` + worldHtml;

    // 更新原生select元素
    const worldSelectHtml = `<option value="">选择世界观</option><option value="auto">🌍 自动生成</option>` +
      worlds.map(h => {
        const id = h._id || h.id;
        return `<option value="${id}">🌍 ${h.inputParams?.era || '世界观'}</option>`;
      }).join('');
    worldSelect.innerHTML = worldSelectHtml;
  }

  // 重新初始化下拉菜单
  initCustomSelects();

  // 存储角色数据供后续使用
  window._storyCharactersData = characters;
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
        const preview = h.inputParams?.archetype || h.content.substring(0, 30);
        const id = h._id || h.id;  // 兼容 _id 和 id
        return `<div class="custom-select-option" data-value="${id}">🎭 ${preview}...</div>`;
      }).join('');

      selectHtml += characters.map(h => {
        const label = h.inputParams?.archetype || '角色';
        const id = h._id || h.id;  // 兼容 _id 和 id
        return `<option value="${id}">🎭 ${label}</option>`;
      }).join('');
    }

    html += `
      <div class="input-group">
        <label>${role} ${isMain ? '(必选)' : '(可选)'} ${i + 1}</label>
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

  console.log('请求数据:', requestData);

  showLoading();

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

  showLoading();

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

    hideLoading();

    currentStoryId = storyId;
    currentStoryData = result.story;

    // 切换到对话界面
    document.getElementById('story演绎-page').style.display = 'none';
    document.getElementById('story-chat-page').style.display = 'block';

    // 更新标题
    document.getElementById('chat-story-name').textContent = result.story.name;

    // 渲染消息
    renderMessages(result.story.messages || []);

    // 更新消息计数
    updateMessageCount(result.story.messages?.length || 0);

    // 初始化NPC选择器
    initNpcSelector();

    // 监听消息类型变化
    initMessageTypeListener();

  } catch (error) {
    hideLoading();
    showNotification('加载失败: ' + error.message, 'error');
  }
}

/**
 * 返回故事列表
 */
function backToStoryList() {
  currentStoryId = null;
  currentStoryData = null;

  document.getElementById('story-chat-page').style.display = 'none';
  document.getElementById('story演绎-page').style.display = 'block';

  // 清空聊天输入
  document.getElementById('chat-input').value = '';

  // 重新加载故事列表
  loadStoryList();
}

/**
 * 初始化NPC选择器
 */
function initNpcSelector() {
  if (!currentStoryData) return;

  const npcContainer = document.getElementById('npc-options');
  const npcSelectGroup = document.getElementById('npc-select-group');

  // 筛选NPC
  const npcs = currentStoryData.characters
    .map((c, index) => ({ ...c, index }))
    .filter(c => c.role === 'NPC');

  if (npcs.length === 0) {
    npcSelectGroup.style.display = 'none';
    return;
  }

  npcSelectGroup.style.display = 'block';

  const html = npcs.map(npc => {
    return `<div class="custom-select-option" data-value="${npc.index}">🎭 ${npc.name || '未知NPC'}</div>`;
  }).join('');

  npcContainer.innerHTML = html;

  // 重新初始化下拉菜单
  setTimeout(() => {
    initCustomSelects();
  }, 10);
}

/**
 * 监听消息类型变化
 */
function initMessageTypeListener() {
  const npcSelectGroup = document.getElementById('npc-select-group');

  // 使用事件委托监听下拉菜单变化
  document.addEventListener('click', function(e) {
    if (e.target.closest('[data-select="message-type"]')) {
      setTimeout(() => {
        const type = getCustomSelectValue('message-type');
        if (type === 'NPC') {
          npcSelectGroup.style.display = 'block';
        } else {
          npcSelectGroup.style.display = 'none';
        }
      }, 10);
    }
  });
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

  let role = message.type;
  let charName = '';

  if (message.type === 'NPC' && message.characterId !== undefined && currentStoryData) {
    const npc = currentStoryData.characters[message.characterId];
    charName = npc?.name || '未知NPC';
    role = `${message.type}(${charName})`;
  }

  return `
    <div class="message message-${message.type}">
      <div class="message-header">
        <span class="message-role">${role}</span>
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

  if (messages.length === 0) {
    // 创建新消息
    const tempMessage = {
      type: getCustomSelectValue('message-type') === '旁白' ? '旁白' : 'NPC',
      content: content,
      timestamp: new Date()
    };
    container.innerHTML += renderMessage(tempMessage);
  } else {
    // 更新最后一条消息
    const lastMessage = messages[messages.length - 1];
    const contentDiv = lastMessage.querySelector('.message-content');
    if (contentDiv) {
      contentDiv.textContent = content;
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
 * 发送消息
 */
async function sendMessage() {
  if (!currentStoryId) {
    showNotification('请先选择一个故事', 'error');
    return;
  }

  const content = document.getElementById('chat-input').value.trim();
  const messageType = getCustomSelectValue('message-type');

  if (!content) {
    showNotification('请输入消息', 'error');
    return;
  }

  const data = { type: messageType, content };

  // 如果是NPC，需要选择NPC
  if (messageType === 'NPC') {
    const npcIndex = getCustomSelectValue('npc-select');
    if (!npcIndex) {
      showNotification('请选择NPC', 'error');
      return;
    }
    data.characterId = parseInt(npcIndex);
  }

  // 渲染用户消息
  const userMessage = {
    type: messageType,
    characterId: data.characterId,
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

  // 流式调用AI
  showLoading();

  try {
    await sendMessageStream(
      currentStoryId,
      data,
      (content) => {
        // onProgress - 实时更新最后一条消息
        updateLastMessage(content);
      },
      (finalContent) => {
        // onComplete
        hideLoading();
        showNotification('发送成功', 'success');

        // 重新加载消息以获取最新的消息列表（包括可能的记忆压缩）
        setTimeout(() => {
          refreshMessages();
        }, 500);
      },
      (error) => {
        // onError
        hideLoading();
        showNotification('发送失败: ' + error, 'error');
      }
    );
  } catch (error) {
    hideLoading();
    showNotification('发送失败: ' + error.message, 'error');
  }
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
});
