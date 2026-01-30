// 故事列表管理模块
// 作者: AI Story Forge
// 版本: 4.0

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

  const html = stories.map(story => renderStoryCardWithRoleButton(story)).join('');

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

/**
 * 在故事列表中渲染角色卡片按钮
 */
function renderStoryCardWithRoleButton(story) {
  const characterNames = story.characters.map(c => c.name || '未知').join(', ');
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
        <button class="btn-small view-btn" onclick="viewStoryRoleCards('${story.id}')">角色卡</button>
        <button class="btn-small btn-danger" onclick="deleteStory('${story.id}')">删除</button>
      </div>
    </div>
  `;
}
