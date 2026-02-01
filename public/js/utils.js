// 工具函数 - UI和辅助功能
// 作者: AI Story Forge
// 版本: 1.0

// 错误码配置
const RETRYABLE_ERROR_CODES = ['BAD_REQUEST', 'RATE_LIMITED', 'INTERNAL_SERVER_ERROR', 'SERVICE_UNAVAILABLE', 'UNKNOWN_ERROR'];
const NON_RETRYABLE_ERROR_CODES = ['UNAUTHORIZED', 'FORBIDDEN', 'MISDIRECTED_REQUEST'];

// 显示/隐藏加载状态
// type: 'loading' | 'ai-creating'
function showLoading(show = true, type = 'loading') {
    const loading = document.getElementById('loading');
    const loadingText = document.getElementById('loading-text');

    if (loading) {
        if (show) {
            // 设置加载文本
            if (loadingText) {
                if (type === 'ai-creating') {
                    loadingText.textContent = 'AI正在创作中...';
                } else {
                    loadingText.textContent = '加载中...';
                }
            }
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

/**
 * 检查错误码是否需要重试
 * @param {string} errorCode - 错误码
 * @returns {boolean} 是否需要重试
 */
function isRetryableError(errorCode) {
    if (!errorCode) return true; // 没有错误码，默认可重试
    return RETRYABLE_ERROR_CODES.includes(errorCode);
}

/**
 * 获取错误类型描述
 * @param {string} errorCode - 错误码
 * @returns {string} 错误类型描述
 */
function getErrorTypeDescription(errorCode) {
    if (!errorCode) return '未知错误';

    switch (errorCode) {
        case 'BAD_REQUEST':
            return '请求参数错误';
        case 'UNAUTHORIZED':
            return '认证失败';
        case 'FORBIDDEN':
            return '无权访问';
        case 'MISDIRECTED_REQUEST':
            return 'API配置错误';
        case 'RATE_LIMITED':
            return '请求过于频繁';
        case 'INTERNAL_SERVER_ERROR':
            return '服务内部错误';
        case 'SERVICE_UNAVAILABLE':
            return '服务暂时不可用';
        default:
            return '未知错误';
    }
}

// 导出错误码配置，供其他模块使用
if (typeof window !== 'undefined') {
    window.RETRYABLE_ERROR_CODES = RETRYABLE_ERROR_CODES;
    window.NON_RETRYABLE_ERROR_CODES = NON_RETRYABLE_ERROR_CODES;
}
