// 创建故事模态框模块
// 作者: AI Story Forge
// 版本: 4.0

// 全局变量：存储角色数据供后续使用
let _storyCharactersData = null;

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

  // 加载历史记录选项（这会设置 _storyCharactersData）
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

  // 重置下拉菜单的初始化状态，以便下次打开时重新初始化
  const plotSelect = document.querySelector('.custom-select[data-select="plot-select"]');
  const worldSelect = document.querySelector('.custom-select[data-select="world-select"]');
  if (plotSelect) {
    delete plotSelect.dataset.initialized;
  }
  if (worldSelect) {
    delete worldSelect.dataset.initialized;
  }
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
  _storyCharactersData = characters;

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
  const characters = _storyCharactersData || [];

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
