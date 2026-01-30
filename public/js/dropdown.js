// 下拉菜单组件 - 可复用的自定义下拉菜单
// 作者: AI Story Forge
// 版本: 1.0

// 初始化所有自定义下拉菜单
function initCustomSelects() {
    const customSelects = document.querySelectorAll('.custom-select');
    customSelects.forEach(selectContainer => {
        initSingleCustomSelect(selectContainer);
    });
}

// 初始化单个自定义下拉菜单
function initSingleCustomSelect(selectContainer) {
    // 检查是否已经初始化过
    if (selectContainer.dataset.initialized === 'true') {
        return;
    }

    const trigger = selectContainer.querySelector('.custom-select-trigger');
    const optionsContainer = selectContainer.querySelector('.custom-select-options');
    const nativeSelect = selectContainer.querySelector('select');
    const valueDisplay = trigger.querySelector('.custom-select-value');

    // 标记为已初始化
    selectContainer.dataset.initialized = 'true';

    // 点击触发器打开/关闭下拉菜单
    trigger.addEventListener('click', function(e) {
        e.stopPropagation();

        // 先关闭所有其他下拉菜单
        document.querySelectorAll('.custom-select-options.show').forEach(openOptions => {
            if (openOptions !== optionsContainer) {
                openOptions.classList.remove('show');
                openOptions.closest('.custom-select').querySelector('.custom-select-trigger').classList.remove('active');
            }
        });

        // 切换当前下拉菜单
        const isOpen = optionsContainer.classList.toggle('show');
        trigger.classList.toggle('active', isOpen);
    });

    // 点击选项（使用事件委托，动态获取选项）
    optionsContainer.addEventListener('click', function(e) {
        const option = e.target.closest('.custom-select-option');
        if (!option) return;

        const value = option.getAttribute('data-value');
        const text = option.textContent;

        console.log(`[dropdown] 点击选项: ${text}, data-value=${value}, nativeSelect=${nativeSelect ? nativeSelect.id : 'null'}`);

        // 更新显示值
        valueDisplay.textContent = text;

        // 更新选中状态（动态获取所有选项）
        const currentOptions = optionsContainer.querySelectorAll('.custom-select-option');
        currentOptions.forEach(opt => opt.classList.remove('selected'));
        option.classList.add('selected');

        // 更新原生select的值
        if (nativeSelect) {
            nativeSelect.value = value;
            // 触发change事件
            nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
            console.log(`[dropdown] 更新 ${nativeSelect.id} = ${value}, 实际值=${nativeSelect.value}`);
        } else {
            console.log(`[dropdown] 未找到 nativeSelect for ${selectContainer.dataset.select}`);
        }

        // 关闭下拉菜单
        optionsContainer.classList.remove('show');
        trigger.classList.remove('active');
    });

    // 点击外部关闭下拉菜单
    document.addEventListener('click', function(e) {
        if (!selectContainer.contains(e.target)) {
            optionsContainer.classList.remove('show');
            trigger.classList.remove('active');
        }
    });

    // 键盘导航支持
    trigger.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            trigger.click();
        } else if (e.key === 'Escape') {
            optionsContainer.classList.remove('show');
            trigger.classList.remove('active');
        }
    });

    // 选项键盘导航
    optionsContainer.addEventListener('keydown', function(e) {
        const currentSelected = optionsContainer.querySelector('.custom-select-option.selected');
        const currentOptions = optionsContainer.querySelectorAll('.custom-select-option');
        let nextOption = null;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            nextOption = currentSelected?.nextElementSibling || currentOptions[0];
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            nextOption = currentSelected?.previousElementSibling || currentOptions[currentOptions.length - 1];
        } else if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            currentSelected?.click();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            optionsContainer.classList.remove('show');
            trigger.classList.remove('active');
            trigger.focus();
        }

        if (nextOption) {
            currentOptions.forEach(opt => opt.classList.remove('selected'));
            nextOption.classList.add('selected');
            nextOption.scrollIntoView({ block: 'nearest' });
        }
    });

    // 使trigger可聚焦
    trigger.setAttribute('tabindex', '0');
    optionsContainer.setAttribute('tabindex', '-1');
}

// 创建自定义下拉菜单组件
function createCustomSelect(selectId, options, defaultValue, placeholder = '请选择') {
    const optionsHtml = options.map((opt) => {
        const isSelected = opt.value === defaultValue;
        return `<div class="custom-select-option ${isSelected ? 'selected' : ''}" data-value="${opt.value}">${opt.label}</div>`;
    }).join('');

    const selectedLabel = options.find(opt => opt.value === defaultValue)?.label || placeholder;

    return `
        <div class="custom-select" data-select="${selectId}">
            <div class="custom-select-trigger">
                <span class="custom-select-value">${selectedLabel}</span>
                <svg class="custom-select-arrow" viewBox="0 0 24 24" fill="none" stroke="#f687b3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
            </div>
            <div class="custom-select-options">
                ${optionsHtml}
            </div>
            <select id="${selectId}" style="display: none;">
                ${options.map(opt => `<option value="${opt.value}" ${opt.value === defaultValue ? 'selected' : ''}>${opt.label}</option>`).join('')}
            </select>
        </div>
    `;
}

// 获取自定义下拉菜单的值（供API调用使用）
function getCustomSelectValue(selectId) {
    const nativeSelect = document.getElementById(selectId);
    if (!nativeSelect) {
        console.log(`[dropdown] 未找到 select 元素: ${selectId}`);
        return null;
    }
    const value = nativeSelect.value;
    console.log(`[dropdown] 获取 ${selectId} = ${value}`);
    return value;
}
