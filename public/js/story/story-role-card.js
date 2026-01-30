// 角色卡片功能模块
// 作者: AI Story Forge
// 版本: 4.0

// 全局变量
let roleCardCurrentIndex = 0;  // 当前显示的角色索引
let roleCardCharacters = [];   // 当前故事的所有角色

// ==================== 角色卡片功能 ====================

/**
 * 打开角色卡片模态框
 * @param {Array} characters - 角色数组
 * @param {number} startIndex - 起始角色索引（默认 0）
 */
function openRoleCardModal(characters, startIndex = 0) {
  if (!characters || characters.length === 0) {
    showNotification('没有角色数据', 'error');
    return;
  }

  roleCardCharacters = characters;
  roleCardCurrentIndex = startIndex;

  const modal = document.getElementById('role-card-modal');
  modal.style.display = 'flex';

  renderRoleCard();
}

/**
 * 关闭角色卡片模态框
 */
function closeRoleCardModal() {
  const modal = document.getElementById('role-card-modal');
  modal.style.display = 'none';
}

/**
 * 导航到上一个/下一个角色
 * @param {number} direction - 1 表示下一个，-1 表示上一个
 */
function navigateRoleCard(direction) {
  if (!roleCardCharacters || roleCardCharacters.length === 0) return;

  roleCardCurrentIndex += direction;

  // 循环导航
  if (roleCardCurrentIndex < 0) {
    roleCardCurrentIndex = roleCardCharacters.length - 1;
  } else if (roleCardCurrentIndex >= roleCardCharacters.length) {
    roleCardCurrentIndex = 0;
  }

  renderRoleCard();
}

/**
 * 渲染当前角色卡片
 */
function renderRoleCard() {
  const character = roleCardCharacters[roleCardCurrentIndex];
  if (!character) return;

  // 更新角色名称
  const nameEl = document.getElementById('role-card-name');
  if (nameEl) {
    nameEl.textContent = character.name || '未知角色';
  }

  // 更新角色类型
  const roleEl = document.getElementById('role-card-role');
  if (roleEl) {
    roleEl.textContent = character.role === '主角' ? '👑 主角' : '🎭 NPC';
  }

  // 更新角色计数
  const counterEl = document.getElementById('role-card-counter');
  if (counterEl) {
    counterEl.textContent = `${roleCardCurrentIndex + 1} / ${roleCardCharacters.length}`;
  }

  // 渲染角色详情
  const detailsEl = document.getElementById('role-card-details');
  if (detailsEl) {
    detailsEl.innerHTML = renderRoleCardDetails(character);
  }

  // 显示/隐藏导航箭头（只有一个角色时隐藏）
  const prevBtn = document.querySelector('.nav-prev');
  const nextBtn = document.querySelector('.nav-next');
  if (prevBtn && nextBtn) {
    const showNav = roleCardCharacters.length > 1;
    prevBtn.style.display = showNav ? 'flex' : 'none';
    nextBtn.style.display = showNav ? 'flex' : 'none';
  }
}

/**
 * 渲染角色详情内容
 */
function renderRoleCardDetails(character) {
  let html = '';

  // 人物原型
  if (character.archetype) {
    html += `
      <div class="role-detail-section">
        <h4>🎭 人物原型</h4>
        <div class="content">${escapeHtml(character.archetype)}</div>
      </div>
    `;
  }

  // 背景设定
  if (character.setting) {
    html += `
      <div class="role-detail-section">
        <h4>🌍 背景设定</h4>
        <div class="content">${escapeHtml(character.setting)}</div>
      </div>
    `;
  }

  // 性格特质
  if (character.traits && character.traits.length > 0) {
    html += `
      <div class="role-detail-section">
        <h4>✨ 性格特质</h4>
        <div class="tag-list">
          ${character.traits.map(t => `<span class="role-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // 外貌特征
  if (character.appearance) {
    html += `
      <div class="role-detail-section">
        <h4>👤 外貌特征</h4>
        <div class="content">${escapeHtml(character.appearance)}</div>
      </div>
    `;
  }

  // 性格描述
  if (character.personality) {
    html += `
      <div class="role-detail-section">
        <h4>💭 性格描述</h4>
        <div class="content">${escapeHtml(character.personality)}</div>
      </div>
    `;
  }

  // 背景故事
  if (character.backstory) {
    html += `
      <div class="role-detail-section">
        <h4>📖 背景故事</h4>
        <div class="content">${escapeHtml(character.backstory)}</div>
      </div>
    `;
  }

  // 动机
  if (character.motivation) {
    html += `
      <div class="role-detail-section">
        <h4>🎯 动机</h4>
        <div class="content">${escapeHtml(character.motivation)}</div>
      </div>
    `;
  }

  // 能力
  if (character.abilities && character.abilities.length > 0) {
    html += `
      <div class="role-detail-section">
        <h4>⚡ 能力</h4>
        <div class="tag-list">
          ${character.abilities.map(a => `<span class="role-tag">${escapeHtml(a)}</span>`).join('')}
        </div>
      </div>
    `;
  }

  // 故事中的角色
  if (character.roleInStory) {
    html += `
      <div class="role-detail-section">
        <h4>📜 故事中的角色</h4>
        <div class="content">${escapeHtml(character.roleInStory)}</div>
      </div>
    `;
  }

  // 如果没有数据，显示提示
  if (!html) {
    html = `
      <div class="role-detail-section">
        <div class="content" style="color: var(--text-muted); text-align: center; padding: var(--spacing-xl);">
          暂无详细角色信息
        </div>
      </div>
    `;
  }

  return html;
}

/**
 * HTML转义
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * 查看故事的所有角色卡片
 */
function viewStoryRoleCards(storyId) {
  const token = localStorage.getItem('token');
  if (!token) {
    showNotification('请先登录', 'error');
    return;
  }

  showLoading(true, 'ai-creating');

  fetch(`/api/story/${storyId}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
    .then(response => response.json())
    .then(result => {
      hideLoading();

      if (!result.success) {
        throw new Error(result.error);
      }

      if (!result.story.characters || result.story.characters.length === 0) {
        showNotification('该故事暂无角色', 'info');
        return;
      }

      openRoleCardModal(result.story.characters, 0);
    })
    .catch(error => {
      hideLoading();
      showNotification('加载失败: ' + error.message, 'error');
    });
}

/**
 * 查看当前故事的所有角色卡片（在聊天界面使用）
 */
function viewCurrentStoryRoleCards() {
  if (!currentStoryData || !currentStoryData.characters) {
    showNotification('没有角色数据', 'error');
    return;
  }

  if (currentStoryData.characters.length === 0) {
    showNotification('该故事暂无角色', 'info');
    return;
  }

  openRoleCardModal(currentStoryData.characters, 0);
}
