// 用户系统相关功能
// 作者: AI Story Forge
// 版本: 1.0

// 页面加载时检查用户状态（仅在需要登录的页面执行）
document.addEventListener('DOMContentLoaded', async () => {
    // 检查当前页面是否需要登录
    const currentPage = window.location.pathname.split('/').pop();
    const publicPages = ['login.html', 'register.html'];

    // 如果当前页面需要登录，检查token
    if (!publicPages.includes(currentPage)) {
        const token = localStorage.getItem('token');
        if (!token) {
            // 未登录，跳转到登录页面
            window.location.href = 'login.html';
            return;
        }

        await checkUserStatus();
        await loadModelsList();
    }
});

// 检查用户状态
async function checkUserStatus() {
    const token = localStorage.getItem('token');
    const userStatusDiv = document.getElementById('user-status');

    if (!token) {
        // Token不存在，跳转到登录页面
        window.location.href = 'login.html';
        return;
    }

    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success && data.user) {
            if (userStatusDiv) {
                userStatusDiv.innerHTML = `
                    <span class="user-welcome">👋 欢迎, ${data.user.username}</span>
                    <span class="user-role ${data.user.role}">${data.user.role === 'admin' ? '👑 管理员' : '👤 用户'}</span>
                    <a href="user.html" class="user-center-link">个人中心</a>
                    ${data.user.role === 'admin' ? '<a href="admin.html" class="user-center-link">管理面板</a>' : ''}
                    <button onclick="logout()" class="logout-btn">退出</button>
                `;
            }
        } else {
            // Token无效
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        }
    } catch (error) {
        console.error('检查用户状态错误:', error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = 'login.html';
    }
}

// 退出登录
function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    showNotification('已退出登录', 'success');
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}
