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

/**
 * 根据结构化数据生成预览文本
 */
function generateStructuredPreview(item) {
    const data = item.structuredData;
    if (!data) return null;

    const toolType = item.toolType;
    const toolData = data[toolType];

    if (!toolData) return null;

    switch (toolType) {
        case 'character':
            return `🎭 ${toolData.name || '未命名'} | ${toolData.archetype || '未知原型'} | ${toolData.setting || '未知背景'}`;

        case 'plot':
            const keywords = toolData.keywords?.join(', ') || '无关键词';
            return `📖 ${toolData.title || '未命名情节'} | ${toolData.genre || '未知类型'} | ${keywords}`;

        case 'world':
            return `🌍 ${toolData.worldName || '未命名世界'} | ${toolData.era || '未知时代'} | ${toolData.culture || '未知文化'}`;

        case 'visual':
            return `🎨 ${toolData.sceneName || '未命名场景'} | ${toolData.artStyle || '未知风格'} | ${toolData.atmosphere || '未知氛围'}`;

        case 'style':
            return `🎭 ${toolData.targetStyle || '未知风格'} | ${toolData.tone || '未知语调'}`;

        case 'cowrite':
            return `✍️ ${toolData.storyTitle || '未命名故事'} | ${toolData.tone || '未知基调'} | ${toolData.continueWithType || '未知类型'}`;

        case 'puzzle':
            return `🧩 ${toolData.puzzleName || '未命名谜题'} | ${toolData.puzzleType || '未知类型'} | ${toolData.difficulty || '未知难度'}`;

        case 'names':
            const nameCount = toolData.names?.length || 0;
            return `🌟 ${toolData.culture || '未知文化'} | ${toolData.gender || '未知性别'} | ${nameCount}个名字`;

        default:
            return null;
    }
}

/**
 * 根据结构化数据生成详情HTML
 */
function generateStructuredDetail(item) {
    const data = item.structuredData;
    if (!data) return '';

    const toolType = item.toolType;
    const toolData = data[toolType];

    if (!toolData) return '';

    let html = '<div class="history-detail-content">';

    switch (toolType) {
        case 'character':
            html += `
                <h4>🎭 角色信息</h4>
                <div class="info-row"><span>名称</span><span>${toolData.name || '未命名'}</span></div>
                <div class="info-row"><span>原型</span><span>${toolData.archetype || '未知'}</span></div>
                <div class="info-row"><span>背景</span><span>${toolData.setting || '未知'}</span></div>
                <div class="info-row"><span>特质</span><span>${toolData.traits?.join(', ') || '未知'}</span></div>
                ${toolData.appearance ? `<div class="info-row"><span>外貌</span><span>${toolData.appearance}</span></div>` : ''}
                ${toolData.personality ? `<div class="info-row"><span>性格</span><span>${toolData.personality}</span></div>` : ''}
                ${toolData.backstory ? `<div class="info-row"><span>背景故事</span><span>${toolData.backstory}</span></div>` : ''}
                ${toolData.motivation ? `<div class="info-row"><span>动机</span><span>${toolData.motivation}</span></div>` : ''}
                ${toolData.abilities?.length ? `<div class="info-row"><span>能力</span><span>${toolData.abilities.join(', ')}</span></div>` : ''}
            `;
            break;

        case 'plot':
            html += `
                <h4>📖 情节信息</h4>
                <div class="info-row"><span>标题</span><span>${toolData.title || '未命名'}</span></div>
                <div class="info-row"><span>概要</span><span>${toolData.summary || '无'}</span></div>
                <div class="info-row"><span>类型</span><span>${toolData.genre || '未知'}</span></div>
                <div class="info-row"><span>复杂度</span><span>${toolData.complexity || '未知'}</span></div>
                ${toolData.keywords?.length ? `<div class="info-row"><span>关键词</span><span>${toolData.keywords.join(', ')}</span></div>` : ''}
                ${toolData.climax ? `<div class="info-row"><span>高潮</span><span>${toolData.climax}</span></div>` : ''}
                ${toolData.resolution ? `<div class="info-row"><span>结局</span><span>${toolData.resolution}</span></div>` : ''}
                ${toolData.themes?.length ? `<div class="info-row"><span>主题</span><span>${toolData.themes.join(', ')}</span></div>` : ''}
            `;
            break;

        case 'world':
            html += `
                <h4>🌍 世界信息</h4>
                <div class="info-row"><span>名称</span><span>${toolData.worldName || '未命名'}</span></div>
                <div class="info-row"><span>时代</span><span>${toolData.era || '未知'}</span></div>
                <div class="info-row"><span>科技</span><span>${toolData.technology || '未知'}</span></div>
                <div class="info-row"><span>文化</span><span>${toolData.culture || '未知'}</span></div>
                ${toolData.magicSystem?.name ? `<div class="info-row"><span>魔法体系</span><span>${toolData.magicSystem.name}</span></div>` : ''}
                ${toolData.geography ? `<div class="info-row"><span>地理</span><span>${toolData.geography}</span></div>` : ''}
                ${toolData.politics ? `<div class="info-row"><span>政治</span><span>${toolData.politics}</span></div>` : ''}
                ${toolData.religions?.length ? `<div class="info-row"><span>宗教</span><span>${toolData.religions.join(', ')}</span></div>` : ''}
            `;
            break;

        case 'visual':
            html += `
                <h4>🎨 场景信息</h4>
                <div class="info-row"><span>名称</span><span>${toolData.sceneName || '未命名'}</span></div>
                <div class="info-row"><span>地点</span><span>${toolData.location || '未知'}</span></div>
                <div class="info-row"><span>时间</span><span>${toolData.time || '未知'}</span></div>
                <div class="info-row"><span>氛围</span><span>${toolData.atmosphere || '未知'}</span></div>
                <div class="info-row"><span>风格</span><span>${toolData.artStyle || '未知'}</span></div>
                <div class="info-row"><span>光照</span><span>${toolData.lighting || '未知'}</span></div>
                ${toolData.colors?.length ? `<div class="info-row"><span>色彩</span><span>${toolData.colors.join(', ')}</span></div>` : ''}
                ${toolData.mood ? `<div class="info-row"><span>情绪</span><span>${toolData.mood}</span></div>` : ''}
            `;
            break;

        case 'style':
            html += `
                <h4>🎭 风格信息</h4>
                <div class="info-row"><span>目标风格</span><span>${toolData.targetStyle || '未知'}</span></div>
                <div class="info-row"><span>语调</span><span>${toolData.tone || '未知'}</span></div>
                ${toolData.vocabulary?.length ? `<div class="info-row"><span>特色词汇</span><span>${toolData.vocabulary.join(', ')}</span></div>` : ''}
                ${toolData.sentenceStructure ? `<div class="info-row"><span>句子结构</span><span>${toolData.sentenceStructure}</span></div>` : ''}
            `;
            break;

        case 'cowrite':
            html += `
                <h4>✍️ 续写信息</h4>
                <div class="info-row"><span>故事标题</span><span>${toolData.storyTitle || '未命名'}</span></div>
                <div class="info-row"><span>基调</span><span>${toolData.tone || '未知'}</span></div>
                <div class="info-row"><span>类型</span><span>${toolData.continueWithType || '未知'}</span></div>
                ${toolData.plotDevelopment ? `<div class="info-row"><span>情节发展</span><span>${toolData.plotDevelopment}</span></div>` : ''}
                ${toolData.themes?.length ? `<div class="info-row"><span>主题</span><span>${toolData.themes.join(', ')}</span></div>` : ''}
            `;
            break;

        case 'puzzle':
            html += `
                <h4>🧩 谜题信息</h4>
                <div class="info-row"><span>名称</span><span>${toolData.puzzleName || '未命名'}</span></div>
                <div class="info-row"><span>类型</span><span>${toolData.puzzleType || '未知'}</span></div>
                <div class="info-row"><span>难度</span><span>${toolData.difficulty || '未知'}</span></div>
                <div class="info-row"><span>主题</span><span>${toolData.theme || '未知'}</span></div>
                ${toolData.setting ? `<div class="info-row"><span>背景</span><span>${toolData.setting}</span></div>` : ''}
                ${toolData.solution ? `<div class="info-row"><span>解决方案</span><span>${toolData.solution}</span></div>` : ''}
                ${toolData.timeLimit ? `<div class="info-row"><span>时间限制</span><span>${toolData.timeLimit}</span></div>` : ''}
            `;
            break;

        case 'names':
            html += `
                <h4>🌟 名字信息</h4>
                <div class="info-row"><span>文化</span><span>${toolData.culture || '未知'}</span></div>
                <div class="info-row"><span>性别</span><span>${toolData.gender || '未知'}</span></div>
                <div class="info-row"><span>时代</span><span>${toolData.era || '未知'}</span></div>
                ${toolData.names?.length ? `<div class="info-row"><span>名字列表</span><span>${toolData.names.map(n => n.name).join(', ')}</span></div>` : ''}
                ${toolData.namingConventions ? `<div class="info-row"><span>命名规则</span><span>${toolData.namingConventions}</span></div>` : ''}
            `;
            break;
    }

    html += '</div>';
    return html;
}

/**
 * 加载历史记录
 */
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

            // 优先使用结构化数据生成预览
            const structuredPreview = generateStructuredPreview(item);
            const preview = structuredPreview || (item.content.substring(0, 100) + (item.content.length > 100 ? '...' : ''));

            return `
<div class="history-item show" data-id="${item.id}">
    <div class="history-header">
        <span class="history-tool">${toolName}</span>
        <span class="history-date">${date}</span>
    </div>
    <div class="history-content">
        ${preview}
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

        // 生成结构化详情
        const structuredDetail = generateStructuredDetail(item);

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
            <p><strong>收藏状态：</strong>${item.isFavorite ? '⭐ 已收藏' : '☆ 未收藏'}</p>
        </div>
        ${structuredDetail}
        <div class="history-detail-content">
            <h4>完整内容（Markdown）：</h4>
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

// 10. 收藏夹（非流式）
async function loadFavorites() {
    const favoritesType = getCustomSelectValue('favorites-type');

    const element = document.getElementById('favorites-list');
    // 显示局部加载提示
    element.innerHTML = '<p class="empty-tip">加载中...</p>';
    element.classList.remove('show');

    try {
        // 调用API获取收藏夹列表
        let url = '/api/favorites/list';
        if (favoritesType && favoritesType !== '全部') {
            url += `?toolType=${favoritesType}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '获取收藏夹失败');
        }

        let favoritesData = data.favorites || [];

        if (favoritesData.length === 0) {
            element.innerHTML = '<p class="empty-tip">暂无收藏记录</p>';
            element.classList.add('show');
            showNotification('暂无收藏记录', 'info');
            return;
        }

        // 生成收藏夹HTML
        const html = favoritesData.map(item => {
            const toolName = getToolName(item.toolType);
            const date = new Date(item.createdAt).toLocaleString('zh-CN');

            // 优先使用结构化数据生成预览
            const structuredPreview = generateStructuredPreview(item);
            const preview = structuredPreview || (item.content.substring(0, 100) + (item.content.length > 100 ? '...' : ''));

            return `
<div class="history-item show" data-id="${item.id}">
    <div class="history-header">
        <span class="history-tool">${toolName}</span>
        <span class="history-date">${date}</span>
    </div>
    <div class="history-content">
        ${preview}
    </div>
    <div class="history-actions">
        <button onclick="viewFavorite('${item.id}')" class="btn-small">查看</button>
        <button onclick="removeFromFavorites('${item.id}')" class="btn-small btn-warning">⭐ 移除收藏</button>
    </div>
</div>
            `;
        }).join('');

        element.innerHTML = html;
        element.classList.add('show');
        showNotification(`加载了 ${favoritesData.length} 条收藏记录`, 'success');

    } catch (error) {
        showNotification('获取收藏夹失败: ' + error.message, 'error');
    }
}

// 查看收藏记录详情
async function viewFavorite(id) {
    try {
        const response = await fetch(`/api/favorites/${id}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '获取收藏记录详情失败');
        }

        const item = data.favorite;
        const toolName = getToolName(item.toolType);
        const date = new Date(item.createdAt).toLocaleString('zh-CN');

        // 生成结构化详情
        const structuredDetail = generateStructuredDetail(item);

        // 显示详情弹窗
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
<div class="modal-content">
    <div class="modal-header">
        <h3>${toolName} - 收藏记录详情</h3>
        <button onclick="this.closest('.modal-overlay').remove()" class="close-btn">✕</button>
    </div>
    <div class="modal-body">
        <div class="history-detail-info">
            <p><strong>创建时间：</strong>${date}</p>
            <p><strong>工具类型：</strong>${toolName}</p>
            <p><strong>状态：</strong>⭐ 已收藏</p>
        </div>
        ${structuredDetail}
        <div class="history-detail-content">
            <h4>完整内容（Markdown）：</h4>
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
        showNotification('获取收藏记录详情失败: ' + error.message, 'error');
    }
}

// 从收藏夹移除记录（不删除原记录）
async function removeFromFavorites(id) {
    if (!confirm('确定要从收藏夹移除这条记录吗？原记录仍会保留在历史记录中。')) {
        return;
    }

    showLoading();

    try {
        const response = await fetch(`/api/favorites/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || '移除收藏失败');
        }

        hideLoading();
        showNotification('已从收藏夹移除', 'success');

        // 重新加载收藏夹
        loadFavorites();

    } catch (error) {
        hideLoading();
        showNotification('移除收藏失败: ' + error.message, 'error');
    }
}
