// 工具函数 - UI和辅助功能
// 作者: AI Story Forge
// 版本: 1.0

// 显示/隐藏加载状态
function showLoading(show = true) {
    const loading = document.getElementById('loading');
    if (loading) {
        if (show) {
            loading.classList.add('show');
        } else {
            loading.classList.remove('show');
        }
    }
}

function hideLoading() {
    showLoading(false);
}

// 显示通知
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = `notification ${type} show`;

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 显示结果
function displayResult(elementId, content) {
    const element = document.getElementById(elementId);
    // 使用marked.js解析Markdown，如果marked不可用则使用原始文本
    if (typeof marked !== 'undefined') {
        element.innerHTML = marked.parse(content);
    } else {
        element.textContent = content;
    }
    element.classList.add('show');
}

// 获取工具类型名称
function getToolTypeName(type) {
    const names = {
        character: '🎭 角色生成',
        plot: '📖 情节编织',
        scene: '🎨 场景可视化',
        style: '🎭 风格转换',
        writing: '✍️ 互动写作',
        world: '🌍 世界构建',
        puzzle: '🧩 谜题设计',
        name: '🌟 名字生成'
    };
    return names[type] || type;
}
