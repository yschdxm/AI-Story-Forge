// AI Story Forge - 用户中心功能模块
// 作者: AI Story Forge
// 版本: 3.1

let currentUser = null;

/**
 * 加载用户信息
 */
async function loadUserInfo() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success && data.user) {
            currentUser = data.user;
            document.getElementById('profile-username').textContent = data.user.username;
            document.getElementById('profile-role').textContent = data.user.role === 'admin' ? '管理员 👑' : '普通用户';
            document.getElementById('profile-created').textContent = new Date(data.user.createdAt).toLocaleString('zh-CN');
        } else {
            logout();
        }
    } catch (error) {
        console.error('加载用户信息错误:', error);
        logout();
    }
}

/**
 * 更新用户名
 */
async function updateUsername() {
    const newUsername = document.getElementById('new-username').value.trim();

    if (!newUsername) {
        showNotification('请输入新用户名', 'error');
        return;
    }

    if (newUsername.length < 3 || newUsername.length > 20) {
        showNotification('用户名长度需在3-20个字符之间', 'error');
        return;
    }

    showLoading(true);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user/username', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ newUsername })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('用户名修改成功', 'success');
            document.getElementById('new-username').value = '';
            await loadUserInfo();
        } else {
            showNotification(data.error || '修改失败', 'error');
        }
    } catch (error) {
        console.error('修改用户名错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 更新密码
 */
async function updatePassword() {
    const oldPassword = document.getElementById('old-password').value.trim();
    const newPassword = document.getElementById('new-password').value.trim();
    const confirmPassword = document.getElementById('confirm-password').value.trim();

    if (!oldPassword || !newPassword || !confirmPassword) {
        showNotification('请填写所有字段', 'error');
        return;
    }

    if (newPassword.length < 6) {
        showNotification('新密码长度至少6位', 'error');
        return;
    }

    if (newPassword !== confirmPassword) {
        showNotification('两次输入的新密码不一致', 'error');
        return;
    }

    showLoading(true);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user/password', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ oldPassword, newPassword })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('密码修改成功', 'success');
            document.getElementById('old-password').value = '';
            document.getElementById('new-password').value = '';
            document.getElementById('confirm-password').value = '';
        } else {
            showNotification(data.error || '修改失败', 'error');
        }
    } catch (error) {
        console.error('修改密码错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 添加模型
 */
async function addModel() {
    const name = document.getElementById('model-name').value.trim();
    const url = document.getElementById('model-url').value.trim();
    const apiKey = document.getElementById('model-key').value.trim();
    const modelId = document.getElementById('model-id').value.trim();

    if (!name || !url || !apiKey || !modelId) {
        showNotification('请填写所有字段', 'error');
        return;
    }

    showLoading(true);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user/models', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, url, apiKey, modelId })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('模型添加成功', 'success');
            document.getElementById('model-name').value = '';
            document.getElementById('model-url').value = '';
            document.getElementById('model-key').value = '';
            document.getElementById('model-id').value = '';
            await loadModels();
        } else {
            showNotification(data.error || '添加失败', 'error');
        }
    } catch (error) {
        console.error('添加模型错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 加载模型列表
 */
async function loadModels() {
    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/user/models', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('models-list');
            if (data.customModels.length === 0) {
                container.innerHTML = '<p class="empty-tip">暂无自定义模型</p>';
            } else {
                container.innerHTML = data.customModels.map(model => `
                    <div class="model-item">
                        <div class="model-info">
                            <strong>${model.name}</strong>
                            <span class="model-id">${model.modelId}</span>
                        </div>
                        <button onclick="deleteModel('${model._id}')" class="delete-btn">删除</button>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('加载模型错误:', error);
    }
}

/**
 * 删除模型
 */
async function deleteModel(modelId) {
    if (!confirm('确定要删除这个模型吗？')) return;

    showLoading(true);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/user/models/${modelId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification('模型已删除', 'success');
            await loadModels();
        } else {
            showNotification(data.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除模型错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 返回主界面
 */
function goBack() {
    window.location.href = 'index.html';
}

/**
 * Tab切换
 */
function initUserTabSwitch() {
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('user-tab-btn')) {
            const tab = e.target.dataset.tab;
            if (!tab) return;

            // 更新按钮状态
            document.querySelectorAll('.user-tab-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            e.target.classList.add('active');

            // 更新内容显示
            document.querySelectorAll('.user-section').forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(`${tab}-tab`).classList.add('active');
        }
    });
}

/**
 * 页面初始化
 */
document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    await loadUserInfo();
    await loadModels();

    // 初始化Tab切换
    initUserTabSwitch();
});
