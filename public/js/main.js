// AI Story Forge - 主入口文件
// 作者: AI Story Forge
// 版本: 3.1

// 工具标签切换
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const toolSections = document.querySelectorAll('.tool-section');

    // 恢复上次使用的模块
    restoreLastActiveTab(tabButtons, toolSections);

    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const targetTool = this.getAttribute('data-tool');

            // 更新按钮状态
            tabButtons.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // 切换内容区域
            toolSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `${targetTool}-tool`) {
                    section.classList.add('active');
                }
            });

            // 保存当前选中的模块到 localStorage
            localStorage.setItem('lastActiveTab', targetTool);

            // 如果是历史记录标签，自动加载历史记录
            if (targetTool === 'history') {
                // 检查用户是否登录
                const token = localStorage.getItem('token');
                if (!token) {
                    showNotification('请先登录以查看历史记录', 'error');
                    // 延迟跳转到登录页面
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                    return;
                }
                // 延迟加载，确保界面切换完成
                setTimeout(() => {
                    loadHistory();
                }, 100);
            }

            // 如果是收藏夹标签，自动加载收藏夹
            if (targetTool === 'favorites') {
                // 检查用户是否登录
                const token = localStorage.getItem('token');
                if (!token) {
                    showNotification('请先登录以查看收藏夹', 'error');
                    // 延迟跳转到登录页面
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1500);
                    return;
                }
                // 延迟加载，确保界面切换完成
                setTimeout(() => {
                    loadFavorites();
                }, 100);
            }
        });
    });

    // 初始化自定义下拉菜单
    initCustomSelects();
});

// 恢复上次使用的模块
function restoreLastActiveTab(tabButtons, toolSections) {
    // 从 localStorage 获取上次选中的模块
    const lastActiveTab = localStorage.getItem('lastActiveTab');

    if (lastActiveTab) {
        // 查找对应的按钮和内容区域
        const targetButton = document.querySelector(`[data-tool="${lastActiveTab}"]`);
        const targetSection = document.getElementById(`${lastActiveTab}-tool`);

        if (targetButton && targetSection) {
            // 更新按钮状态
            tabButtons.forEach(b => b.classList.remove('active'));
            targetButton.classList.add('active');

            // 切换内容区域
            toolSections.forEach(section => {
                section.classList.remove('active');
            });
            targetSection.classList.add('active');

            // 如果是历史记录标签，自动加载历史记录
            if (lastActiveTab === 'history') {
                const token = localStorage.getItem('token');
                if (token) {
                    setTimeout(() => {
                        loadHistory();
                    }, 100);
                }
            }

            // 如果是收藏夹标签，自动加载收藏夹
            if (lastActiveTab === 'favorites') {
                const token = localStorage.getItem('token');
                if (token) {
                    setTimeout(() => {
                        loadFavorites();
                    }, 100);
                }
            }

            return; // 成功恢复，直接返回
        }
    }

    // 如果没有保存的模块或恢复失败，默认使用角色生成器（第一个模块）
    // 这是默认行为，不需要额外操作
}

// 为历史记录筛选下拉菜单添加自动筛选功能
const historyTypeSelect = document.getElementById('history-type');
if (historyTypeSelect) {
    historyTypeSelect.addEventListener('change', function() {
        // 延迟一小段时间，确保下拉菜单UI更新完成
        setTimeout(() => {
            loadHistory();
        }, 50);
    });
}

// 初始化粒子背景
if (typeof particlesJS !== 'undefined') {
    particlesJS('particles-js', {
        particles: {
            number: { value: 80, density: { enable: true, value_area: 800 } },
            color: { value: '#fbbf24' },
            shape: { type: 'circle' },
            opacity: { value: 0.5, random: true },
            size: { value: 3, random: true },
            line_linked: {
                enable: true,
                distance: 150,
                color: '#6b46c1',
                opacity: 0.3,
                width: 1
            },
            move: {
                enable: true,
                speed: 2,
                direction: 'none',
                random: true,
                straight: false,
                out_mode: 'out',
                bounce: false
            }
        },
        interactivity: {
            detect_on: 'canvas',
            events: {
                onhover: { enable: true, mode: 'repulse' },
                onclick: { enable: true, mode: 'push' },
                resize: true
            }
        },
        retina_detect: true
    });
}
