// API调用函数
// 作者: AI Story Forge
// 版本: 1.0

// API调用函数 - 流式版本
async function callAPIStream(endpoint, data, onProgress, onComplete, onError) {
    try {
        // 获取当前选中的模型配置
        const modelConfig = getCurrentModel();

        // 如果有选中的模型，添加到请求数据中
        if (modelConfig) {
            data.modelConfig = modelConfig;
        }

        const token = localStorage.getItem('token');
        const headers = {
            'Content-Type': 'application/json'
        };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '请求失败');
        }

        // 获取响应流
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        // 读取流数据
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
                break;
            }

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n').filter(line => line.trim());

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const dataStr = line.slice(6); // 移除 "data: " 前缀

                    try {
                        const parsed = JSON.parse(dataStr);

                        if (parsed.error) {
                            // 收到错误，显示错误信息
                            hideLoading();
                            showNotification('生成失败: ' + parsed.error, 'error');
                            onError(parsed.error);
                            return;
                        }

                        if (parsed.done) {
                            // 流式结束
                            if (fullContent) {
                                onComplete(parsed.content || fullContent);
                            } else {
                                // 内容为空，显示错误
                                hideLoading();
                                showNotification('生成失败: 未返回内容', 'error');
                                onError('未返回内容');
                            }
                            return;
                        }

                        if (parsed.content) {
                            fullContent += parsed.content;
                            // 实时更新进度
                            onProgress(fullContent);
                        }
                    } catch (e) {
                        // 忽略JSON解析错误
                    }
                }
            }
        }

        // 如果没有收到完成信号
        if (fullContent) {
            onComplete(fullContent);
        } else {
            hideLoading();
            showNotification('生成失败: 连接中断', 'error');
            onError('连接中断');
        }

    } catch (error) {
        hideLoading();
        showNotification('生成失败: ' + error.message, 'error');
        onError(error.message);
    }
}

// API调用函数 - 非流式版本（备用）
async function callAPI(endpoint, data) {
    try {
        const response = await fetch(`/api/${endpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        return await response.json();
    } catch (error) {
        throw new Error('网络请求失败: ' + error.message);
    }
}

// ==================== 故事相关API ====================

// 获取故事列表
async function getStoryList(page = 1, limit = 20) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/story/list?page=${page}&limit=${limit}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return await response.json();
}

// 创建故事
async function createStory(data) {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/story/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    return await response.json();
}

// 删除故事
async function deleteStoryAPI(storyId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/story/${storyId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return await response.json();
}

// 获取故事详情
async function getStory(storyId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/story/${storyId}`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    return await response.json();
}

// 非流式发送消息（故事演绎使用）
async function sendMessageNonStream(storyId, data, onComplete, onError) {
    const token = localStorage.getItem('token');
    const modelConfig = getCurrentModel();

    if (modelConfig) {
        data.modelConfig = modelConfig;
    }

    try {
        const response = await fetch(`/api/story/${storyId}/message`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(data)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '请求失败');
        }

        // 读取完整的响应体
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            fullContent += decoder.decode(value, { stream: true });
        }

        // 解析SSE格式的响应
        const lines = fullContent.split('\n').filter(line => line.trim());
        let finalContent = '';

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                try {
                    const parsed = JSON.parse(dataStr);
                    if (parsed.error) {
                        onError(parsed.error);
                        return;
                    }
                    if (parsed.content) {
                        finalContent += parsed.content;
                    }
                } catch (e) {
                    // 忽略解析错误
                }
            }
        }

        onComplete(finalContent);
    } catch (error) {
        onError(error.message);
    }
}
