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
  const deleteModalOverlay = document.getElementById('delete-modal-overlay');
  const deleteCancelBtn = document.getElementById('delete-cancel-btn');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
  const includeContextToggle = document.getElementById('include-context-toggle');

  // Minimal Markdown renderer with basic sanitization
  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function renderMarkdown(md) {
    if (!md) return '';

    // Normalize line endings
    md = md.replace(/\r\n?/g, '\n');

    // Process fenced code blocks first (```lang\ncode```)
    let inCodeBlock = false;
    let codeLang = '';
    const lines = md.split('\n');
    const htmlLines = [];
    let listOpen = false;
    let olOpen = false;

    function closeLists() {
      if (listOpen) { htmlLines.push('</ul>'); listOpen = false; }
      if (olOpen) { htmlLines.push('</ol>'); olOpen = false; }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Fenced code blocks
      const fenceMatch = line.match(/^```\s*([a-zA-Z0-9_-]+)?\s*$/);
      if (fenceMatch) {
        closeLists();
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeLang = fenceMatch[1] ? ` class="language-${escapeHtml(fenceMatch[1])}"` : '';
          htmlLines.push(`<pre><code${codeLang}>`);
        } else {
          inCodeBlock = false;
          codeLang = '';
          htmlLines.push('</code></pre>');
        }
        continue;
      }

      if (inCodeBlock) {
        htmlLines.push(escapeHtml(line));
        continue;
      }

      // Headings # to ######
      const heading = line.match(/^(#{1,6})\s+(.*)$/);
      if (heading) {
        closeLists();
        const level = heading[1].length;
        const text = heading[2];
        htmlLines.push(`<h${level}>${inlineMarkdown(text)}</h${level}>`);
        continue;
      }

      // Ordered list
      const olItem = line.match(/^\s*\d+\.\s+(.*)$/);
      if (olItem) {
        if (!olOpen) { closeLists(); htmlLines.push('<ol>'); olOpen = true; }
        htmlLines.push(`<li>${inlineMarkdown(olItem[1])}</li>`);
        continue;
      }

      // Unordered list
      const ulItem = line.match(/^\s*[-*+]\s+(.*)$/);
      if (ulItem) {
        if (!listOpen) { closeLists(); htmlLines.push('<ul>'); listOpen = true; }
        htmlLines.push(`<li>${inlineMarkdown(ulItem[1])}</li>`);
        continue;
      }

      // Empty line => paragraph break
      if (line.trim() === '') {
        closeLists();
        htmlLines.push('<br/>');
        continue;
      }

      // Paragraph
      closeLists();
      htmlLines.push(`<p>${inlineMarkdown(line)}</p>`);
    }

    // Close any open lists
    closeLists();
    // Close code block if somehow left open (malformed input)
    if (inCodeBlock) {
      htmlLines.push('</code></pre>');
    }

    return htmlLines.join('\n');
  }

  function inlineMarkdown(text) {
    // Escape first
    let s = escapeHtml(text);
    // Links [text](url)
    s = s.replace(/\[([^\]]+)\]\((https?:[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Bold **text**
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Italic *text* or _text_
    s = s.replace(/(^|\W)\*([^*]+)\*(?=\W|$)/g, '$1<em>$2</em>');
    s = s.replace(/(^|\W)_([^_]+)_(?=\W|$)/g, '$1<em>$2</em>');
    // Inline code `code`
    s = s.replace(/`([^`]+)`/g, '<code>$1</code>');
    return s;
  }

  // Check if API key is set
  checkApiKey();
  
  // Load and save toggle state
  const CONTEXT_TOGGLE_KEY = 'includePageContext';
  
  // Load saved toggle state
  chrome.storage.local.get([CONTEXT_TOGGLE_KEY], (result) => {
    if (includeContextToggle && result[CONTEXT_TOGGLE_KEY] !== undefined) {
      includeContextToggle.checked = result[CONTEXT_TOGGLE_KEY];
    }
  });
  
  // Save toggle state when changed
  if (includeContextToggle) {
    includeContextToggle.addEventListener('change', () => {
      chrome.storage.local.set({ [CONTEXT_TOGGLE_KEY]: includeContextToggle.checked });
    });
  }

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

  function isChatEmpty(messages) {
    // Chat is empty if it only has the greeting message or no messages
    if (!messages || messages.length === 0) return true;
    if (messages.length === 1 && 
        messages[0].role === 'assistant' && 
        messages[0].content === 'How can I help?') {
      return true;
    }
    return false;
  }

  async function deleteEmptyChat(chatId) {
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    const all = stored[STORAGE_KEY] || {};
    const entry = all[chatId];
    const messages = Array.isArray(entry) ? entry : (entry && entry.messages) || [];
    if (entry && isChatEmpty(messages)) {
      delete all[chatId];
      await chrome.storage.local.set({ [STORAGE_KEY]: all });
      return true;
    }
    return false;
  }

  async function loadHistory() {
    const chatId = getCurrentChatId();
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    const all = stored[STORAGE_KEY] || {};
    const entry = all[chatId];
    if (!entry) return [];
    return Array.isArray(entry) ? entry : (entry.messages || []);
  }

  async function saveHistory(history, opts = {}) {
    const chatId = getCurrentChatId();
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    const all = stored[STORAGE_KEY] || {};
    const prev = all[chatId];
    let title = opts.title || null;
    if (!title && prev && !Array.isArray(prev)) {
      title = prev.title || null;
    }
    all[chatId] = { messages: history, title };
    await chrome.storage.local.set({ [STORAGE_KEY]: all });
    await updateHistoryList();
  }

  async function getAllChats() {
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    const all = stored[STORAGE_KEY] || {};
    return Object.entries(all)
      .map(([id, value]) => {
        const messages = Array.isArray(value) ? value : (value?.messages || []);
        const title = Array.isArray(value) ? null : (value?.title || null);
        return { id, messages, title };
      })
      .filter(({ messages }) => !isChatEmpty(messages)) // Only show non-empty chats
      .map(({ id, messages, title }) => ({
        id,
        messages,
        title,
        preview: getChatPreview(messages, title),
        timestamp: getChatTimestamp(id)
      }))
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  function getChatPreview(messages, title) {
    if (title && typeof title === 'string' && title.trim()) {
      return title.trim();
    }
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
    // Delete current chat if it's empty before switching
    const currentId = getCurrentChatId();
    if (currentId !== chatId) {
      await deleteEmptyChat(currentId);
    }
    
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

  // Delete confirmation modal
  function showDeleteModal() {
    return new Promise((resolve) => {
      deleteModalOverlay.classList.add('active');
      
      const handleConfirm = () => {
        deleteModalOverlay.classList.remove('active');
        deleteConfirmBtn.removeEventListener('click', handleConfirm);
        deleteCancelBtn.removeEventListener('click', handleCancel);
        deleteModalOverlay.removeEventListener('click', handleOverlayClick);
        resolve(true);
      };
      
      const handleCancel = () => {
        deleteModalOverlay.classList.remove('active');
        deleteConfirmBtn.removeEventListener('click', handleConfirm);
        deleteCancelBtn.removeEventListener('click', handleCancel);
        deleteModalOverlay.removeEventListener('click', handleOverlayClick);
        resolve(false);
      };

      const handleOverlayClick = (e) => {
        if (e.target === deleteModalOverlay) {
          handleCancel();
        }
      };
      
      deleteConfirmBtn.addEventListener('click', handleConfirm);
      deleteCancelBtn.addEventListener('click', handleCancel);
      deleteModalOverlay.addEventListener('click', handleOverlayClick);
    });
  }

  async function deleteChat(chatId) {
    const confirmed = await showDeleteModal();
    if (!confirmed) return;
    
    const stored = await chrome.storage.local.get([STORAGE_KEY]);
    const all = stored[STORAGE_KEY] || {};
    delete all[chatId];
    await chrome.storage.local.set({ [STORAGE_KEY]: all });
    
    // Always create a new chat after deleting
    if (chatId === getCurrentChatId()) {
      const newId = `chat_${Date.now()}`;
      await setCurrentChatId(newId);
      messagesContainer.innerHTML = '';
      addMessage('How can I help?', false);
      await saveHistory([{ role: 'assistant', content: 'How can I help?' }]);
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
    if (isUser) {
      content.textContent = text;
    } else {
      content.innerHTML = renderMarkdown(text);
    }
    
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

    // Check if we should include webpage context
    const includeContext = includeContextToggle && includeContextToggle.checked;

    chrome.runtime.sendMessage(
      { 
        type: 'GET_AI_RESPONSE', 
        question: question, 
        messages: context,
        includePageContext: includeContext
      },
      (response) => {
        removeLoadingMessage(loadingMsg);
        sendBtn.disabled = false;
        
        if (response && response.success) {
          const aiMsg = addMessage(response.answer, false);
          const updated = [...context, aiMsg];
          saveHistory(updated).then(async () => {
            // Generate title after first exchange
            const firstUser = updated.find(m => m.role === 'user');
            const assistants = updated.filter(m => m.role === 'assistant');
            const firstAssistant = assistants.find(m => m.content !== 'How can I help?');
            if (firstUser && firstAssistant && updated.length <= 3) {
              chrome.runtime.sendMessage(
                {
                  type: 'GENERATE_CHAT_TITLE',
                  user: firstUser.content,
                  assistant: firstAssistant.content
                },
                async (titleResp) => {
                  if (titleResp && titleResp.success && titleResp.title) {
                    const stored = await chrome.storage.local.get([STORAGE_KEY]);
                    const all = stored[STORAGE_KEY] || {};
                    const chatId = getCurrentChatId();
                    const entry = all[chatId];
                    if (entry && !Array.isArray(entry)) {
                      entry.title = titleResp.title;
                      all[chatId] = entry;
                      await chrome.storage.local.set({ [STORAGE_KEY]: all });
                      await updateHistoryList();
                    }
                  }
                }
              );
            }
          });
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

  // Always start with a new chat when opening sidebar
  initCurrentChat().then(async () => {
    await updateHistoryList();
    
    // Create new chat on open
    const newId = `chat_${Date.now()}`;
    await setCurrentChatId(newId);
    messagesContainer.innerHTML = '';
    addMessage('How can I help?', false);
    await saveHistory([{ role: 'assistant', content: 'How can I help?' }]);
    
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
      // Delete current chat if it's empty before creating new one
      const currentId = getCurrentChatId();
      await deleteEmptyChat(currentId);
      
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

  // Settings button in chat history sidebar
  const historySettingsBtn = document.getElementById('history-settings-btn');
  if (historySettingsBtn) {
    historySettingsBtn.addEventListener('click', () => {
      chrome.action.openPopup();
    });
  }

  // Establish connection with background script to detect when sidebar closes
  chrome.runtime.connect({ name: 'sidepanel' });
  
  // Notify when sidebar might be closing and cleanup empty chats
  window.addEventListener('pagehide', async () => {
    // Clean up empty chat before closing
    const currentId = getCurrentChatId();
    await deleteEmptyChat(currentId);
    // This is no longer needed, disconnection port will handle it
    // chrome.runtime.sendMessage({ type: 'SIDEBAR_CLOSED' });
  });
})();

