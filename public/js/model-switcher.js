// 模型切换功能
// 作者: AI Story Forge
// 版本: 1.0

let currentModel = null;
let publicModels = [];
let personalModels = [];

// 加载模型列表
async function loadModelsList() {
    const token = localStorage.getItem('token');
    const modelSelectContainer = document.getElementById('model-select-container');
    const currentModelSpan = document.getElementById('current-model');

    // 如果页面没有模型选择器元素，直接返回（例如个人中心页面）
    if (!modelSelectContainer || !currentModelSpan) {
        return;
    }

    if (!token) {
        // 未登录，只显示公用模型
        await loadPublicModels();
        renderModelSelect();
        return;
    }

    // 已登录，加载公用模型和个人模型，以及用户的选中模型
    await Promise.all([
        loadPublicModels(),
        loadPersonalModels(),
        loadSelectedModelFromServer()
    ]);

    // 渲染统一下拉菜单
    renderModelSelect();
}

// 加载公用模型
async function loadPublicModels() {
    try {
        const response = await fetch('/api/admin/public-models');
        const data = await response.json();

        if (data.success) {
            publicModels = data.models.filter(m => m.isActive);
        }
    } catch (error) {
        console.error('加载公用模型错误:', error);
        publicModels = [];
    }
}

// 加载个人模型
async function loadPersonalModels() {
    const token = localStorage.getItem('token');
    if (!token) {
        personalModels = [];
        return;
    }

    try {
        const response = await fetch('/api/user/models', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success) {
            personalModels = data.customModels;
        }
    } catch (error) {
        console.error('加载个人模型错误:', error);
        personalModels = [];
    }
}

// 从服务器加载用户的选中模型
async function loadSelectedModelFromServer() {
    const token = localStorage.getItem('token');
    if (!token) {
        currentModel = null;
        return null;
    }

    try {
        const response = await fetch('/api/user/selected-model', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success && data.selectedModel) {
            currentModel = data.selectedModel;
            return currentModel;
        }
    } catch (error) {
        console.error('加载选中模型错误:', error);
    }

    currentModel = null;
    return null;
}

// 渲染统一下拉菜单
function renderModelSelect() {
    const modelSelectContainer = document.getElementById('model-select-container');
    const currentModelSpan = document.getElementById('current-model');

    // 如果页面没有模型选择器，直接返回（例如个人中心页面）
    if (!modelSelectContainer || !currentModelSpan) {
        return;
    }

    // 构建所有模型选项（公用 + 个人）
    const allModels = [];

    // 添加公用模型
    publicModels.forEach(model => {
        allModels.push({
            value: `public_${model.id || model._id}`,
            label: `🌐 ${model.name} (公用)`,
            model: model,
            type: 'public'
        });
    });

    // 添加个人模型
    personalModels.forEach(model => {
        allModels.push({
            value: `personal_${model.id || model._id}`,
            label: `👤 ${model.name} (个人)`,
            model: model,
            type: 'personal'
        });
    });

    // 如果没有模型，显示提示
    if (allModels.length === 0) {
        modelSelectContainer.innerHTML = '<p class="empty-tip">暂无可用模型</p>';
        currentModelSpan.textContent = '未选择';
        return;
    }

    // 确定当前选中的值
    let defaultValue = '';
    if (currentModel) {
        const currentValue = `${currentModel.type}_${currentModel.id}`;
        const found = allModels.find(m => m.value === currentValue);
        if (found) {
            defaultValue = currentValue;
        }
    }

    // 创建下拉菜单HTML
    const selectId = 'model-select';
    const placeholder = '请选择模型...';
    const selectHtml = createCustomSelect(selectId, allModels, defaultValue, placeholder);
    modelSelectContainer.innerHTML = selectHtml;

    // 初始化下拉菜单功能
    const selectContainer = modelSelectContainer.querySelector('.custom-select');
    if (selectContainer) {
        initSingleCustomSelect(selectContainer);
    }

    // 监听模型选择变化
    const nativeSelect = document.getElementById(selectId);
    if (nativeSelect) {
        nativeSelect.addEventListener('change', function() {
            const selectedValue = this.value;
            if (selectedValue) {
                // 解析选中的模型
                const parts = selectedValue.split('_');
                const type = parts[0];
                const modelId = parts.slice(1).join('_');

                selectModel(type, modelId);
            }
        });
    }

    // 更新当前模型显示
    if (currentModel) {
        currentModelSpan.textContent = currentModel.name;
    } else {
        currentModelSpan.textContent = '未选择';
    }
}

// 选择模型
async function selectModel(type, modelId) {
    let models = type === 'public' ? publicModels : personalModels;
    const model = models.find(m => (m.id === modelId || m._id === modelId));

    if (model) {
        const modelConfig = {
            id: model.id || model._id,
            name: model.name,
            url: model.url,
            apiKey: model.apiKey,
            modelId: model.modelId,
            type: type
        };

        // 保存到后端（需要登录）
        const token = localStorage.getItem('token');
        if (!token) {
            showNotification('请先登录以保存模型选择', 'error');
            return;
        }

        try {
            const response = await fetch('/api/user/selected-model', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ modelConfig })
            });

            const data = await response.json();

            if (data.success) {
                currentModel = modelConfig;
                showNotification(`已切换到模型: ${model.name}`, 'success');

                // 更新当前模型显示
                const currentModelSpan = document.getElementById('current-model');
                if (currentModelSpan) {
                    currentModelSpan.textContent = currentModel.name;
                }
            } else {
                showNotification(data.error || '模型切换失败', 'error');
            }
        } catch (error) {
            console.error('保存模型到后端失败:', error);
            showNotification('模型切换失败，请稍后重试', 'error');
        }
    }
}

// 获取当前选中的模型
function getCurrentModel() {
    // 只返回内存中的 currentModel
    // 模型选择必须通过后端 API 获取
    return currentModel;
}
