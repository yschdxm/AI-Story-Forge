// AI Story Forge - 管理员面板功能模块
// 作者: AI Story Forge
// 版本: 3.1

/**
 * 页面加载时检查管理员权限
 */
async function checkAdminStatus() {
    const token = localStorage.getItem('token');
    const adminStatusDiv = document.getElementById('admin-status');

    try {
        const response = await fetch('/api/auth/me', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success && data.user && data.user.role === 'admin') {
            adminStatusDiv.innerHTML = `
                <span class="user-welcome">👑 ${data.user.username}</span>
                <span class="user-role admin">管理员</span>
                <button onclick="logout()" class="logout-btn">退出</button>
            `;
        } else {
            showNotification('权限不足，需要管理员权限', 'error');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    } catch (error) {
        console.error('检查权限错误:', error);
        showNotification('验证失败，请重新登录', 'error');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 2000);
    }
}

/**
 * 加载系统设置
 */
async function loadSystemSettings() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/admin/settings', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const toggle = document.getElementById('registration-toggle');
            const status = document.getElementById('registration-status');

            toggle.checked = data.settings.registrationEnabled;
            status.textContent = data.settings.registrationEnabled ? '已开启' : '已关闭';
            status.style.color = data.settings.registrationEnabled ? '#48bb78' : '#f56565';
        }
    } catch (error) {
        console.error('加载设置错误:', error);
    }
}

/**
 * 切换注册开关
 */
async function toggleRegistration() {
    const token = localStorage.getItem('token');
    const toggle = document.getElementById('registration-toggle');
    const enabled = toggle.checked;

    showLoading(true);

    try {
        const response = await fetch('/api/admin/settings/registration', {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            const status = document.getElementById('registration-status');
            status.textContent = enabled ? '已开启' : '已关闭';
            status.style.color = enabled ? '#48bb78' : '#f56565';
        } else {
            showNotification(data.error || '操作失败', 'error');
            toggle.checked = !enabled; // 恢复状态
        }
    } catch (error) {
        console.error('切换注册开关错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
        toggle.checked = !enabled; // 恢复状态
    } finally {
        showLoading(false);
    }
}

/**
 * 加载用户列表
 */
async function loadUserList() {
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/admin/users', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('user-list');

            // 更新统计信息
            const totalUsers = data.users.length;
            const totalAdmins = data.users.filter(u => u.role === 'admin').length;
            document.getElementById('total-users').textContent = totalUsers;
            document.getElementById('total-admins').textContent = totalAdmins;
            document.getElementById('db-status').textContent = '✅ 已连接';
            document.getElementById('db-status').style.color = '#48bb78';

            if (data.users.length === 0) {
                container.innerHTML = '<p class="empty-tip">暂无用户</p>';
            } else {
                container.innerHTML = data.users.map(user => `
                    <div class="user-item">
                        <div class="user-info">
                            <strong>${user.username}</strong>
                            <span class="user-role-badge ${user.role}">${user.role === 'admin' ? '👑 管理员' : '👤 用户'}</span>
                            <span class="user-meta">注册: ${new Date(user.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <div class="user-actions">
                            ${user.role === 'user' ? `
                                <button onclick="promoteUser('${user.id}')" class="promote-btn">提权</button>
                            ` : ''}
                            ${user.role === 'admin' ? `
                                <button onclick="demoteUser('${user.id}')" class="demote-btn">降权</button>
                            ` : ''}
                            <button onclick="deleteUser('${user.id}', '${user.username}')" class="delete-btn">删除</button>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('加载用户列表错误:', error);
        document.getElementById('db-status').textContent = '❌ 连接失败';
        document.getElementById('db-status').style.color = '#f56565';
    }
}

/**
 * 提权用户
 */
async function promoteUser(userId) {
    if (!confirm('确定要将此用户提权为管理员吗？')) return;

    showLoading(true);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}/promote`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            await loadUserList();
        } else {
            showNotification(data.error || '提权失败', 'error');
        }
    } catch (error) {
        console.error('提权错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 降权用户
 */
async function demoteUser(userId) {
    if (!confirm('确定要将此用户降权为普通用户吗？')) return;

    showLoading(true);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}/demote`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            await loadUserList();
        } else {
            showNotification(data.error || '降权失败', 'error');
        }
    } catch (error) {
        console.error('降权错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 删除用户
 */
async function deleteUser(userId, username) {
    if (!confirm(`确定要删除用户 "${username}" 吗？此操作不可恢复！`)) return;

    showLoading(true);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            await loadUserList();
        } else {
            showNotification(data.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除用户错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 添加公用模型
 */
async function addPublicModel() {
    const name = document.getElementById('public-model-name').value.trim();
    const url = document.getElementById('public-model-url').value.trim();
    const apiKey = document.getElementById('public-model-key').value.trim();
    const modelId = document.getElementById('public-model-id').value.trim();
    const description = document.getElementById('public-model-desc').value.trim();

    if (!name || !url || !apiKey || !modelId) {
        showNotification('请填写所有必填字段', 'error');
        return;
    }

    showLoading(true);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/admin/public-models', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, url, apiKey, modelId, description })
        });

        const data = await response.json();

        if (data.success) {
            showNotification('公用模型添加成功', 'success');
            // 清空表单
            document.getElementById('public-model-name').value = '';
            document.getElementById('public-model-url').value = '';
            document.getElementById('public-model-key').value = '';
            document.getElementById('public-model-id').value = '';
            document.getElementById('public-model-desc').value = '';
            await loadPublicModels();
        } else {
            showNotification(data.error || '添加失败', 'error');
        }
    } catch (error) {
        console.error('添加公用模型错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 加载公用模型列表
 */
async function loadPublicModels() {
    try {
        const response = await fetch('/api/admin/public-models');
        const data = await response.json();

        if (data.success) {
            const container = document.getElementById('public-models-list');

            if (data.models.length === 0) {
                container.innerHTML = '<p class="empty-tip">暂无公用模型</p>';
            } else {
                container.innerHTML = data.models.map(model => `
                    <div class="model-item ${model.isActive ? '' : 'disabled'}">
                        <div class="model-info">
                            <strong>${model.name}</strong>
                            <span class="model-id">${model.modelId}</span>
                            <span class="model-meta">创建者: ${model.createdBy} | ${new Date(model.createdAt).toLocaleDateString('zh-CN')}</span>
                        </div>
                        <div class="model-actions">
                            <button onclick="togglePublicModel('${model.id}', ${!model.isActive})" class="toggle-btn">
                                ${model.isActive ? '禁用' : '启用'}
                            </button>
                            <button onclick="deletePublicModel('${model.id}', '${model.name}')" class="delete-btn">删除</button>
                        </div>
                    </div>
                `).join('');
            }
        }
    } catch (error) {
        console.error('加载公用模型错误:', error);
    }
}

/**
 * 切换公用模型状态
 */
async function togglePublicModel(modelId, active) {
    showLoading(true);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/public-models/${modelId}/status`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ active })
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            await loadPublicModels();
        } else {
            showNotification(data.error || '操作失败', 'error');
        }
    } catch (error) {
        console.error('切换模型状态错误:', error);
        showNotification('网络错误，请稍后重试', 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * 删除公用模型
 */
async function deletePublicModel(modelId, name) {
    if (!confirm(`确定要删除模型 "${name}" 吗？`)) return;

    showLoading(true);

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/admin/public-models/${modelId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showNotification(data.message, 'success');
            await loadPublicModels();
        } else {
            showNotification(data.error || '删除失败', 'error');
        }
    } catch (error) {
        console.error('删除公用模型错误:', error);
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
function initAdminTabSwitch() {
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

    await checkAdminStatus();
    await loadSystemSettings();
    await loadUserList();
    await loadPublicModels();

    // 初始化Tab切换
    initAdminTabSwitch();
});
