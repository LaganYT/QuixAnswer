// Side panel script for QuixAnswer
(function() {
  'use strict';

  // DOM Elements
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('send-btn');
  const messagesContainer = document.getElementById('messages');
  const chatContainer = document.getElementById('chat-container');
  const historyListEl = document.getElementById('history-list');
  const historyToggleBtn = document.getElementById('history-toggle-btn');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  const chatHistorySidebar = document.getElementById('chat-history-sidebar');

  // Check if API key is set
  checkApiKey();

  async function checkApiKey() {
    const result = await chrome.storage.local.get(['apiKey']);
    if (!result.apiKey) {
      showSetupMessage();
    } else {
      // Add initial greeting as the first AI message if none exist
      if (messagesContainer.children.length === 0) {
        addMessage('How can I help?', false);
      }
    }
  }

  function showSetupMessage() {
    messagesContainer.innerHTML = `
      <div class="setup-message">
        <h3>Welcome to QuixAnswer!</h3>
        <p>To get started, you need to set up your Groq API key.</p>
        <p>Get a FREE key at <a href="https://console.groq.com/keys" target="_blank">console.groq.com/keys</a></p>
        <button class="setup-btn" id="setup-btn">Open Settings</button>
      </div>
    `;

    document.getElementById('setup-btn').addEventListener('click', () => {
      window.open(chrome.runtime.getURL('popup.html'), 'QuixAnswer Settings', 'width=400,height=600');
    });
  }

  // Chat functionality + memory
  const STORAGE_KEY = 'quix_chat_history';
  const CURRENT_CHAT_KEY = 'quix_current_chat_id';
  let currentChatId = 'default';

  async function initCurrentChat() {
    const stored = await chrome.storage.local.get([CURRENT_CHAT_KEY]);
    if (stored[CURRENT_CHAT_KEY]) {
      currentChatId = stored[CURRENT_CHAT_KEY];
    } else {
      await chrome.storage.local.set({ [CURRENT_CHAT_KEY]: currentChatId });
    }
  }

  function getCurrentChatId() {
    return currentChatId;
  }

  async function setCurrentChatId(id) {
    currentChatId = id;
    await chrome.storage.local.set({ [CURRENT_CHAT_KEY]: id });
  }

  async function loadHistory() {
    const chatId = getCurrentChatId();
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    const all = stored[STORAGE_KEY] || {};
    return all[chatId] || [];
  }

  async function saveHistory(history) {
    const chatId = getCurrentChatId();
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    const all = stored[STORAGE_KEY] || {};
    all[chatId] = history;
    await chrome.storage.local.set({ [STORAGE_KEY]: all });
    await updateHistoryList();
  }

  async function getAllChats() {
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    const all = stored[STORAGE_KEY] || {};
    return Object.entries(all).map(([id, messages]) => ({
      id,
      messages,
      preview: getChatPreview(messages),
      timestamp: getChatTimestamp(id)
    })).sort((a, b) => b.timestamp - a.timestamp);
  }

  function getChatPreview(messages) {
    // Get first user message or use default
    const firstUserMsg = messages.find(m => m.role === 'user');
    if (firstUserMsg) {
      return firstUserMsg.content.substring(0, 40) + (firstUserMsg.content.length > 40 ? '...' : '');
    }
    return 'New Chat';
  }

  function getChatTimestamp(chatId) {
    // Extract timestamp from chat_<timestamp> format
    const match = chatId.match(/chat_(\d+)/);
    return match ? parseInt(match[1]) : 0;
  }

  // Sidebar toggle functionality
  function toggleSidebar(open) {
    if (open) {
      chatHistorySidebar.classList.add('open');
      sidebarOverlay.classList.add('active');
    } else {
      chatHistorySidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
    }
  }

  async function updateHistoryList() {
    const chats = await getAllChats();
    historyListEl.innerHTML = '';
    
    for (const chat of chats) {
      const item = document.createElement('div');
      item.className = 'history-item' + (chat.id === getCurrentChatId() ? ' active' : '');
      item.innerHTML = `
        <div class="history-item-text">${chat.preview}</div>
        <button class="history-item-delete" data-chat-id="${chat.id}" title="Delete chat">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 2L12 12M2 12L12 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </button>
      `;
      
      // Click to switch chat
      item.addEventListener('click', async (e) => {
        if (e.target.closest('.history-item-delete')) return;
        await switchToChat(chat.id);
      });
      
      // Delete button
      const deleteBtn = item.querySelector('.history-item-delete');
      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deleteChat(chat.id);
      });
      
      historyListEl.appendChild(item);
    }
  }

  async function switchToChat(chatId) {
    await setCurrentChatId(chatId);
    const history = await loadHistory();
    messagesContainer.innerHTML = '';
    for (const msg of history) {
      addMessage(msg.content, msg.role === 'user');
    }
    await updateHistoryList();
    toggleSidebar(false); // Close sidebar after switching
    input.focus();
  }

  async function deleteChat(chatId) {
    if (!confirm('Delete this chat?')) return;
    
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    const all = stored[STORAGE_KEY] || {};
    delete all[chatId];
    await chrome.storage.local.set({ [STORAGE_KEY]: all });
    
    // If deleting current chat, switch to another or create new
    if (chatId === getCurrentChatId()) {
      const remaining = Object.keys(all);
      if (remaining.length > 0) {
        await switchToChat(remaining[0]);
      } else {
        // Create new chat if none left
        const newId = `chat_${Date.now()}`;
        await setCurrentChatId(newId);
        messagesContainer.innerHTML = '';
        addMessage('How can I help?', false);
        await saveHistory([{ role: 'assistant', content: 'How can I help?' }]);
      }
    } else {
      await updateHistoryList();
    }
  }

  async function renderHistory() {
    const history = await loadHistory();
    messagesContainer.innerHTML = '';
    for (const msg of history) {
      addMessage(msg.content, msg.role === 'user');
    }
    return history;
  }
  function addMessage(text, isUser = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'}`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = isUser ? 'U' : 'AI';
    
    const content = document.createElement('div');
    content.className = 'message-content';
    content.textContent = text;
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(content);
    messagesContainer.appendChild(messageDiv);
    
    // Scroll to bottom
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return { role: isUser ? 'user' : 'assistant', content: text };
  }

  function addLoadingMessage() {
    const loadingDiv = document.createElement('div');
    loadingDiv.className = 'message ai-message loading-message';
    loadingDiv.innerHTML = `
      <div class="message-avatar">AI</div>
      <div class="message-content">
        <div class="loading-dots">
          <span></span><span></span><span></span>
        </div>
      </div>
    `;
    messagesContainer.appendChild(loadingDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
    return loadingDiv;
  }

  function removeLoadingMessage(loadingDiv) {
    if (loadingDiv && loadingDiv.parentNode) {
      loadingDiv.parentNode.removeChild(loadingDiv);
    }
  }

  async function sendMessage() {
    const question = input.value.trim();
    if (!question) return;

    // Add user message
    const userMsg = addMessage(question, true);
    input.value = '';

    // Disable send button
    sendBtn.disabled = true;

    // Show loading
    const loadingMsg = addLoadingMessage();

    // Prepare history and send to background
    const prior = await loadHistory();
    const context = [...prior, userMsg];
    await saveHistory(context);

    chrome.runtime.sendMessage(
      { type: 'GET_AI_RESPONSE', question: question, messages: context },
      (response) => {
        removeLoadingMessage(loadingMsg);
        sendBtn.disabled = false;
        
        if (response && response.success) {
          const aiMsg = addMessage(response.answer, false);
          saveHistory([...context, aiMsg]);
        } else {
          const errorMsg = response?.error || 'Failed to get response';
          addMessage(`Error: ${errorMsg}`, false);
        }
        
        // Focus back on input
        input.focus();
      }
    );
  }

  // Event listeners
  sendBtn.addEventListener('click', sendMessage);
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Load and render stored history on open
  initCurrentChat().then(async () => {
    await updateHistoryList();
    const history = await renderHistory();
    if (history.length === 0) {
      addMessage('How can I help?', false);
      await saveHistory([{ role: 'assistant', content: 'How can I help?' }]);
    }
    input.focus();
  });

  // Event listeners for sidebar toggle
  historyToggleBtn.addEventListener('click', () => {
    const isOpen = chatHistorySidebar.classList.contains('open');
    toggleSidebar(!isOpen);
  });

  sidebarOverlay.addEventListener('click', () => {
    toggleSidebar(false);
  });

  // New Chat button: create a new chat id and reset view/history
  const newChatBtn = document.getElementById('new-chat-btn');
  if (newChatBtn) {
    newChatBtn.addEventListener('click', async () => {
      const newId = `chat_${Date.now()}`;
      await setCurrentChatId(newId);
      messagesContainer.innerHTML = '';
      addMessage('How can I help?', false);
      await saveHistory([{ role: 'assistant', content: 'How can I help?' }]);
      await updateHistoryList();
      input.value = '';
      input.focus();
    });
  }

  // Listen for storage changes (when API key is added)
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.apiKey) {
      // Remove setup message if it exists
      const setupMessage = document.querySelector('.setup-message');
      if (setupMessage) {
        messagesContainer.innerHTML = '';
        addMessage('How can I help?', false);
      }
    }
  });

  // Notify when sidebar might be closing
  window.addEventListener('pagehide', () => {
    chrome.runtime.sendMessage({ type: 'SIDEBAR_CLOSED' });
  });
})();

