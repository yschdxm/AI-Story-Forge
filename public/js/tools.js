// AI工具函数 - 8个AI工具的实现
// 作者: AI Story Forge
// 版本: 1.0

// 1. 角色生成器（流式）
async function generateCharacter() {
    const archetype = document.getElementById('char-archetype').value.trim();
    const setting = document.getElementById('char-setting').value.trim();
    const traits = document.getElementById('char-traits').value.trim();

    if (!archetype || !setting || !traits) {
        showNotification('请填写所有字段', 'error');
        return;
    }

    // 仅在响应前显示加载状态
    showLoading();

    const element = document.getElementById('character-result');
    element.innerHTML = '';
    element.classList.remove('show');

    // 实时更新显示
    callAPIStream('generate-character', {
        archetype,
        setting,
        traits
    },
    // onProgress - 实时更新
    (content) => {
        // 隐藏加载状态（AI已开始响应）
        hideLoading();
        // 实时显示Markdown解析后的内容
        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(content);
        } else {
            element.textContent = content;
        }
        element.classList.add('show');
    },
    // onComplete
    (finalContent) => {
        // 确保最终内容完全显示
        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(finalContent);
        } else {
            element.textContent = finalContent;
        }
        element.classList.add('show');
        showNotification('角色生成成功！', 'success');
    },
    // onError
    (error) => {
        hideLoading();
        showNotification('生成失败: ' + error, 'error');
    });
}

// 2. 情节编织器（流式）
async function weavePlot() {
    const keywords = document.getElementById('plot-keywords').value.trim();
    const genre = getCustomSelectValue('plot-genre');
    const complexity = getCustomSelectValue('plot-complexity');

    if (!keywords) {
        showNotification('请输入故事关键词', 'error');
        return;
    }

    // 仅在响应前显示加载状态
    showLoading();

    const element = document.getElementById('plot-result');
    element.innerHTML = '';
    element.classList.remove('show');

    // 实时更新显示
    callAPIStream('weave-plot', {
        keywords,
        genre,
        complexity
    },
    // onProgress - 实时更新
    (content) => {
        // 隐藏加载状态（AI已开始响应）
        hideLoading();

        const html = `
<b>📖 情节框架 (${genre})</b>

${content}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>复杂度: ${complexity} | 关键词: ${keywords}</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
    },
    // onComplete
    (finalContent) => {
        hideLoading();
        const html = `
<b>📖 情节框架 (${genre})</b>

${finalContent}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>复杂度: ${complexity} | 关键词: ${keywords}</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
        showNotification('情节编织完成！', 'success');
    },
    // onError
    (error) => {
        hideLoading();
        showNotification('编织失败: ' + error, 'error');
    });
}

// 3. 场景可视化（流式）
async function visualizeScene() {
    const sceneDescription = document.getElementById('visual-scene').value.trim();
    const artStyle = getCustomSelectValue('visual-style');

    if (!sceneDescription) {
        showNotification('请输入场景描述', 'error');
        return;
    }

    // 仅在响应前显示加载状态
    showLoading();

    const element = document.getElementById('visual-result');
    element.innerHTML = '';
    element.classList.remove('show');

    // 实时更新显示
    callAPIStream('visualize-scene', {
        sceneDescription,
        artStyle
    },
    // onProgress - 实时更新
    (content) => {
        // 隐藏加载状态（AI已开始响应）
        hideLoading();

        const html = `
<b>🎨 视觉描述 (${artStyle}风格)</b>

${content}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>💡 提示：这些描述可用于AI绘图工具</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
    },
    // onComplete
    (finalContent) => {
        hideLoading();
        const html = `
<b>🎨 视觉描述 (${artStyle}风格)</b>

${finalContent}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>💡 提示：这些描述可用于AI绘图工具</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
        showNotification('场景可视化完成！', 'success');
    },
    // onError
    (error) => {
        hideLoading();
        showNotification('可视化失败: ' + error, 'error');
    });
}

// 4. 风格转换器（流式）
async function transformStyle() {
    const text = document.getElementById('style-text').value.trim();
    const targetStyle = getCustomSelectValue('style-target');

    if (!text) {
        showNotification('请输入要转换的文本', 'error');
        return;
    }

    // 仅在响应前显示加载状态
    showLoading();

    const element = document.getElementById('style-result');
    element.innerHTML = '';
    element.classList.remove('show');

    // 实时更新显示
    callAPIStream('transform-style', {
        text,
        targetStyle
    },
    // onProgress - 实时更新
    (content) => {
        // 隐藏加载状态（AI已开始响应）
        hideLoading();

        const html = `
<b>🎭 转换后的风格: ${targetStyle}</b>

${content}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>原始文本长度: ${text.length} 字符</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
    },
    // onComplete
    (finalContent) => {
        hideLoading();
        const html = `
<b>🎭 转换后的风格: ${targetStyle}</b>

${finalContent}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>原始文本长度: ${text.length} 字符</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
        showNotification('风格转换完成！', 'success');
    },
    // onError
    (error) => {
        hideLoading();
        showNotification('转换失败: ' + error, 'error');
    });
}

// 5. 互动写作（流式）
async function coWrite() {
    const storySoFar = document.getElementById('cowrite-story').value.trim();
    const tone = getCustomSelectValue('cowrite-tone');
    const continueWithType = getCustomSelectValue('cowrite-type');

    if (!storySoFar) {
        showNotification('请先输入故事内容', 'error');
        return;
    }

    // 仅在响应前显示加载状态
    showLoading();

    const element = document.getElementById('cowrite-result');
    element.innerHTML = '';
    element.classList.remove('show');

    // 实时更新显示
    callAPIStream('co-write', {
        storySoFar,
        tone,
        continueWithType
    },
    // onProgress - 实时更新
    (content) => {
        // 隐藏加载状态（AI已开始响应）
        hideLoading();

        const html = `
<b>✍️ AI续写 (${tone}基调)</b>
<b>角色: ${continueWithType}</b>

${content}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>💡 你可以复制这段内容，继续创作！</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
    },
    // onComplete
    (finalContent) => {
        hideLoading();
        const html = `
<b>✍️ AI续写 (${tone}基调)</b>
<b>角色: ${continueWithType}</b>

${finalContent}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>💡 你可以复制这段内容，继续创作！</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
        showNotification('AI续写完成！', 'success');
    },
    // onError
    (error) => {
        hideLoading();
        showNotification('续写失败: ' + error, 'error');
    });
}

// 6. 世界构建器（流式）
async function buildWorld() {
    const era = getCustomSelectValue('world-era');
    const technology = getCustomSelectValue('world-tech');
    const magicSystem = getCustomSelectValue('world-magic');
    const culture = document.getElementById('world-culture').value.trim();

    if (!culture) {
        showNotification('请输入文化背景', 'error');
        return;
    }

    // 仅在响应前显示加载状态
    showLoading();

    const element = document.getElementById('world-result');
    element.innerHTML = '';
    element.classList.remove('show');

    // 实时更新显示
    callAPIStream('build-world', {
        era,
        technology,
        magicSystem,
        culture
    },
    // onProgress - 实时更新
    (content) => {
        // 隐藏加载状态（AI已开始响应）
        hideLoading();

        const html = `
<b>🌍 世界构建 (${era}时代)</b>
<b>科技: ${technology} | 魔法: ${magicSystem}</b>

${content}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>💡 一个完整的世界观诞生了！</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
    },
    // onComplete
    (finalContent) => {
        hideLoading();
        const html = `
<b>🌍 世界构建 (${era}时代)</b>
<b>科技: ${technology} | 魔法: ${magicSystem}</b>

${finalContent}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>💡 一个完整的世界观诞生了！</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
        showNotification('世界构建完成！', 'success');
    },
    // onError
    (error) => {
        hideLoading();
        showNotification('构建失败: ' + error, 'error');
    });
}

// 7. 谜题设计器（流式）
async function designPuzzle() {
    const puzzleType = getCustomSelectValue('puzzle-type');
    const difficulty = getCustomSelectValue('puzzle-difficulty');
    const theme = document.getElementById('puzzle-theme').value.trim();
    const setting = document.getElementById('puzzle-setting').value.trim();

    if (!theme || !setting) {
        showNotification('请输入主题和背景设定', 'error');
        return;
    }

    // 仅在响应前显示加载状态
    showLoading();

    const element = document.getElementById('puzzle-result');
    element.innerHTML = '';
    element.classList.remove('show');

    // 实时更新显示
    callAPIStream('design-puzzle', {
        puzzleType,
        difficulty,
        theme,
        setting
    },
    // onProgress - 实时更新
    (content) => {
        // 隐藏加载状态（AI已开始响应）
        hideLoading();

        const html = `
<b>🧩 谜题设计</b>
<b>类型: ${puzzleType} | 难度: ${difficulty}</b>
<b>主题: ${theme} | 背景: ${setting}</b>

${content}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>💡 一个创意谜题诞生了！</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
    },
    // onComplete
    (finalContent) => {
        hideLoading();
        const html = `
<b>🧩 谜题设计</b>
<b>类型: ${puzzleType} | 难度: ${difficulty}</b>
<b>主题: ${theme} | 背景: ${setting}</b>

${finalContent}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>💡 一个创意谜题诞生了！</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
        showNotification('谜题设计完成！', 'success');
    },
    // onError
    (error) => {
        hideLoading();
        showNotification('设计失败: ' + error, 'error');
    });
}

// 8. 名字生成器（流式）
async function generateNames() {
    const culture = getCustomSelectValue('names-culture');
    const gender = getCustomSelectValue('names-gender');
    const era = getCustomSelectValue('names-era');
    const count = document.getElementById('names-count').value.trim();

    if (!count || count < 1 || count > 20) {
        showNotification('请输入1-20之间的数字', 'error');
        return;
    }

    // 仅在响应前显示加载状态
    showLoading();

    const element = document.getElementById('names-result');
    element.innerHTML = '';
    element.classList.remove('show');

    // 实时更新显示
    callAPIStream('generate-names', {
        culture,
        gender,
        era,
        count
    },
    // onProgress - 实时更新
    (content) => {
        // 隐藏加载状态（AI已开始响应）
        hideLoading();

        const html = `
<b>🌟 名字生成</b>
<b>文化: ${culture} | 性别: ${gender}</b>
<b>时代: ${era} | 数量: ${count}</b>

${content}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>💡 为你的角色找到完美的名字！</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
    },
    // onComplete
    (finalContent) => {
        hideLoading();
        const html = `
<b>🌟 名字生成</b>
<b>文化: ${culture} | 性别: ${gender}</b>
<b>时代: ${era} | 数量: ${count}</b>

${finalContent}

<hr style="margin: 15px 0; border-color: rgba(255,255,255,0.1);">
<small>💡 为你的角色找到完美的名字！</small>
        `;

        if (typeof marked !== 'undefined') {
            element.innerHTML = marked.parse(html);
        } else {
            element.textContent = html;
        }
        element.classList.add('show');
        showNotification('名字生成完成！', 'success');
    },
    // onError
    (error) => {
        hideLoading();
        showNotification('生成失败: ' + error, 'error');
    });
}

// 9. 历史记录（非流式）
async function loadHistory() {
    const historyType = getCustomSelectValue('history-type');

    const element = document.getElementById('history-list');
    // 显示局部加载提示
    element.innerHTML = '<p class="empty-tip">加载中...</p>';
    element.classList.remove('show');

    try {
        // 调用API获取历史记录
        const response = await fetch('/api/history/list', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '获取历史记录失败');
        }

        let historyData = data.histories || [];

        // 根据类型筛选
        if (historyType && historyType !== '全部') {
            historyData = historyData.filter(item => item.toolType === historyType);
        }

        if (historyData.length === 0) {
            element.innerHTML = '<p class="empty-tip">暂无历史记录</p>';
            element.classList.add('show');
            showNotification('暂无历史记录', 'info');
            return;
        }

        // 生成历史记录HTML
        const html = historyData.map(item => {
            const toolName = getToolName(item.toolType);
            const date = new Date(item.createdAt).toLocaleString('zh-CN');
            const preview = item.content.substring(0, 100) + (item.content.length > 100 ? '...' : '');

            return `
<div class="history-item show" data-id="${item.id}">
    <div class="history-header">
        <span class="history-tool">${toolName}</span>
        <span class="history-date">${date}</span>
    </div>
    <div class="history-content">
        ${typeof marked !== 'undefined' ? marked.parse(preview) : preview}
    </div>
    <div class="history-actions">
        <button onclick="viewHistory('${item.id}')" class="btn-small">查看</button>
        <button onclick="deleteHistory('${item.id}')" class="btn-small btn-danger">删除</button>
        <button onclick="toggleFavorite('${item.id}', ${item.isFavorite})" class="btn-small btn-warning">
            ${item.isFavorite ? '⭐ 取消收藏' : '☆ 收藏'}
        </button>
    </div>
</div>
            `;
        }).join('');

        element.innerHTML = html;
        element.classList.add('show');
        showNotification(`加载了 ${historyData.length} 条历史记录`, 'success');

    } catch (error) {
        showNotification('获取历史记录失败: ' + error.message, 'error');
    }
}

// 查看历史记录详情
async function viewHistory(id) {
    try {
        const response = await fetch(`/api/history/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '获取历史记录详情失败');
        }

        const item = data.history;
        const toolName = getToolName(item.toolType);
        const date = new Date(item.createdAt).toLocaleString('zh-CN');

        // 显示详情弹窗
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
<div class="modal-content">
    <div class="modal-header">
        <h3>${toolName} - 历史记录详情</h3>
        <button onclick="this.closest('.modal-overlay').remove()" class="close-btn">✕</button>
    </div>
    <div class="modal-body">
        <div class="history-detail-info">
            <p><strong>创建时间：</strong>${date}</p>
            <p><strong>工具类型：</strong>${toolName}</p>
            <p><strong>收藏状态：</strong>${item.favorite ? '⭐ 已收藏' : '☆ 未收藏'}</p>
        </div>
        <div class="history-detail-content">
            <h4>生成内容：</h4>
            <div class="result-area show">
                ${typeof marked !== 'undefined' ? marked.parse(item.content) : item.content}
            </div>
        </div>
        <div class="history-detail-input">
            <h4>输入参数：</h4>
            <pre>${JSON.stringify(item.inputParams, null, 2)}</pre>
        </div>
    </div>
</div>
        `;
        document.body.appendChild(modal);

    } catch (error) {
        showNotification('获取历史记录详情失败: ' + error.message, 'error');
    }
}

// 删除历史记录
async function deleteHistory(id) {
    if (!confirm('确定要删除这条历史记录吗？')) {
        return;
    }

    showLoading();

    try {
        const response = await fetch(`/api/history/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '删除历史记录失败');
        }

        hideLoading();
        showNotification('历史记录已删除', 'success');

        // 重新加载历史记录
        loadHistory();

    } catch (error) {
        hideLoading();
        showNotification('删除历史记录失败: ' + error.message, 'error');
    }
}

// 切换收藏状态
async function toggleFavorite(id, currentFavorite) {
    try {
        const response = await fetch(`/api/history/${id}/favorite`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ favorite: !currentFavorite })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '切换收藏状态失败');
        }

        showNotification(currentFavorite ? '已取消收藏' : '已收藏', 'success');

        // 更新当前卡片的UI状态，而不是重新加载整个列表
        const historyItem = document.querySelector(`[data-id="${id}"]`);
        if (historyItem) {
            const favoriteBtn = historyItem.querySelector('.btn-warning');
            if (favoriteBtn) {
                // 更新按钮文本和状态
                const newFavoriteState = !currentFavorite;
                favoriteBtn.textContent = newFavoriteState ? '⭐ 取消收藏' : '☆ 收藏';
                favoriteBtn.onclick = () => toggleFavorite(id, newFavoriteState);
            }
        }

    } catch (error) {
        showNotification('切换收藏状态失败: ' + error.message, 'error');
    }
}

// 清空历史记录
async function clearHistory() {
    if (!confirm('确定要清空所有历史记录吗？此操作不可恢复！')) {
        return;
    }



    try {
        const response = await fetch('/api/history', {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '清空历史记录失败');
        }


        showNotification('历史记录已清空', 'success');

        // 重新加载历史记录
        loadHistory();

    } catch (error) {

        showNotification('清空历史记录失败: ' + error.message, 'error');
    }
}

// 获取工具名称
function getToolName(toolType) {
    const toolNames = {
        'character': '🎭 角色生成器',
        'plot': '📖 情节编织器',
        'visual': '🎨 场景可视化',
        'style': '🎭 风格转换器',
        'cowrite': '✍️ 互动写作板',
        'world': '🌍 世界构建器',
        'puzzle': '🧩 谜题设计器',
        'names': '🌟 名字生成器'
    };
    return toolNames[toolType] || '未知工具';
}
