// AI Story Forge - 主入口文件
// 作者: AI Story Forge
// 版本: 3.1

// 工具标签切换
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const toolSections = document.querySelectorAll('.tool-section');

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
        });
    });

    // 初始化自定义下拉菜单
    initCustomSelects();

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
});
