// 故事演绎功能 - 主入口文件
// 作者: AI Story Forge
// 版本: 4.0

// 导入模块
// 注意：由于使用 script 标签加载，所有函数和变量都是全局的
// 这些模块文件需要在 HTML 中按顺序引入

// ==================== 全局变量导出（供其他模块使用） ====================

// 故事对话相关全局变量（在 story-chat.js 中定义）
// currentStoryId, currentStoryData, memoryPollingInterval, memoryPollingTimeout

// 角色卡片相关全局变量（在 story-role-card.js 中定义）
// roleCardCurrentIndex, roleCardCharacters

// 创建故事相关全局变量（在 story-create-modal.js 中定义）
// _storyCharactersData

// ==================== 模块加载检查 ====================

// 检查必要的依赖是否已加载
function checkDependencies() {
  const requiredFunctions = [
    'showLoading', 'hideLoading', 'showNotification',  // utils.js
    'initCustomSelects', 'getCustomSelectValue',        // dropdown.js
    'getCurrentModel',                                  // model-switcher.js
    'sendMessageNonStream'                              // api.js
  ];

  const missing = requiredFunctions.filter(fn => typeof window[fn] !== 'function');
  if (missing.length > 0) {
    console.warn('[story] 缺少依赖函数:', missing);
  }
}

// 在 DOM 加载后检查依赖
document.addEventListener('DOMContentLoaded', checkDependencies);

// ==================== 模块导出（用于调试和扩展） ====================

// 导出所有模块函数到 window 对象
// 这样可以在浏览器控制台中访问和调试

window.StoryModules = {
  // story-list.js
  loadStoryList,
  renderStoryList,
  searchStories,
  deleteStory,
  deleteAllStories,
  renderStoryCardWithRoleButton,

  // story-create-modal.js
  openCreateStoryModal,
  closeCreateStoryModal,
  loadHistoryOptions,
  updateCharacterSections,
  submitCreateStory,

  // story-chat.js
  enterStory,
  backToStoryList,
  renderMessages,
  renderMessage,
  showCharacterFromMessage,
  updateLastMessage,
  updateMessageCount,
  scrollToBottom,
  showButtonLoading,
  hideButtonLoading,
  sendMessage,
  refreshMessages,
  startMemoryCompressionPolling,

  // story-role-card.js
  openRoleCardModal,
  closeRoleCardModal,
  navigateRoleCard,
  renderRoleCard,
  renderRoleCardDetails,
  escapeHtml,
  viewStoryRoleCards,
  viewCurrentStoryRoleCards
};

console.log('[story] 模块已加载:', Object.keys(window.StoryModules));
