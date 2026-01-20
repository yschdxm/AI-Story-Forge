// AI Story Forge - 认证相关功能模块 (登录/注册)
// 作者: AI Story Forge
// 版本: 3.1

// 注意: showNotification() 函数在 utils.js 中定义

/**
 * 登录函数
 */
async function login() {
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value.trim();

    if (!username || !password) {
        showNotification('请输入用户名和密码', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // 保存token和用户信息
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showNotification('登录成功！正在跳转...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showNotification(data.error || '登录失败', 'error');
        }
    } catch (error) {
        console.error('登录错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

/**
 * 注册函数
 */
async function register() {
    const username = document.getElementById('register-username').value.trim();
    const password = document.getElementById('register-password').value.trim();
    const confirm = document.getElementById('register-confirm').value.trim();

    if (!username || !password) {
        showNotification('请填写所有必填项', 'error');
        return;
    }

    if (username.length < 3 || username.length > 20) {
        showNotification('用户名长度需在3-20个字符之间', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('密码长度至少6位', 'error');
        return;
    }

    if (password !== confirm) {
        showNotification('两次输入的密码不一致', 'error');
        return;
    }

    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            // 保存token和用户信息
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            showNotification('注册成功！正在跳转...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } else {
            showNotification(data.error || '注册失败', 'error');
        }
    } catch (error) {
        console.error('注册错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    }
}

/**
 * 初始化认证页面 (登录/注册)
 */
function initAuthPage() {
    // 检查是否已登录
    const token = localStorage.getItem('token');
    if (token) {
        window.location.href = 'index.html';
        return;
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

    // 回车键事件
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            if (document.getElementById('login-username')) {
                login();
            } else if (document.getElementById('register-username')) {
                register();
            }
        }
    });
}

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', initAuthPage);
