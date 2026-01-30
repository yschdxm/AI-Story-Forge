// 页面初始化模块
// 作者: AI Story Forge
// 版本: 4.0

// ==================== 页面初始化 ====================

// 页面加载时自动加载故事列表
document.addEventListener('DOMContentLoaded', function () {
  // 检查是否在故事演绎页面
  const storyPage = document.getElementById('story演绎-page');
  if (storyPage && storyPage.classList.contains('active')) {
    loadStoryList();
  }

  // 搜索框监听
  const searchInput = document.getElementById('story-search');
  if (searchInput) {
    let searchTimeout;
    searchInput.addEventListener('input', function () {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        searchStories(this.value);
      }, 300);
    });
  }

  // 聊天输入框回车发送消息
  const chatInput = document.getElementById('chat-input');
  if (chatInput) {
    chatInput.addEventListener('keydown', function (e) {
      // 回车键发送（Shift+回车换行）
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });
  }
});
