// Main application script for QuixAnswer Web
(function() {
  'use strict';

  // DOM Elements
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('send-btn');
  const messagesContainer = document.getElementById('messages');
  const chatContainer = document.getElementById('chat-container');
  const historyListEl = document.getElementById('history-list');
  const chatHistorySidebar = document.getElementById('chat-history-sidebar');
  const deleteModalOverlay = document.getElementById('delete-modal-overlay');
  const deleteCancelBtn = document.getElementById('delete-cancel-btn');
  const deleteConfirmBtn = document.getElementById('delete-confirm-btn');
  const includeContextToggle = document.getElementById('include-context-toggle');
  const historySettingsBtn = document.getElementById('history-settings-btn');
  const settingsPopup = document.getElementById('settings-popup');
  const settingsCloseBtn = document.getElementById('settings-close-btn');
  const settingsApiKey = document.getElementById('settings-apiKey');
  const settingsModel = document.getElementById('settings-model');
  const settingsSaveBtn = document.getElementById('settings-save-btn');
  const settingsStatus = document.getElementById('settings-status');

  // Storage keys
  const STORAGE_KEY = 'quix_chat_history';
  const CURRENT_CHAT_KEY = 'quix_current_chat_id';
  const CONTEXT_TOGGLE_KEY = 'includePageContext';
  const API_KEY_KEY = 'apiKey';
  const MODEL_KEY = 'model';

  // Current state
  let currentChatId = 'default';

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

  // Storage functions (using localStorage instead of chrome.storage)
  function getStorageItem(key) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (e) {
      console.error('Error getting storage item:', e);
      return null;
    }
  }

  function setStorageItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Error setting storage item:', e);
      return false;
    }
  }

  // Check if API key is set
  async function checkApiKey() {
    const apiKey = getStorageItem(API_KEY_KEY);
    if (!apiKey) {
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
      window.open('settings.html', '_blank', 'width=400,height=600');
    });
  }

  // Chat functionality + memory
  async function initCurrentChat() {
    const stored = getStorageItem(CURRENT_CHAT_KEY);
    if (stored) {
      currentChatId = stored;
    } else {
      setStorageItem(CURRENT_CHAT_KEY, currentChatId);
    }
  }

  function getCurrentChatId() {
    return currentChatId;
  }

  async function setCurrentChatId(id) {
    currentChatId = id;
    setStorageItem(CURRENT_CHAT_KEY, id);
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
    const all = getStorageItem(STORAGE_KEY) || {};
    const entry = all[chatId];
    const messages = Array.isArray(entry) ? entry : (entry && entry.messages) || [];
    if (entry && isChatEmpty(messages)) {
      delete all[chatId];
      setStorageItem(STORAGE_KEY, all);
      return true;
    }
    return false;
  }

  async function loadHistory() {
    const chatId = getCurrentChatId();
    const all = getStorageItem(STORAGE_KEY) || {};
    const entry = all[chatId];
    if (!entry) return [];
    return Array.isArray(entry) ? entry : (entry.messages || []);
  }

  async function saveHistory(history, opts = {}) {
    const chatId = getCurrentChatId();
    const all = getStorageItem(STORAGE_KEY) || {};
    const prev = all[chatId];
    let title = opts.title || null;
    if (!title && prev && !Array.isArray(prev)) {
      title = prev.title || null;
    }
    all[chatId] = { messages: history, title };
    setStorageItem(STORAGE_KEY, all);
    await updateHistoryList();
  }

  async function getAllChats() {
    const all = getStorageItem(STORAGE_KEY) || {};
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

  // Settings popup functionality
  function showSettingsPopup() {
    settingsPopup.classList.add('active');
    // Load current settings
    const apiKey = getStorageItem(API_KEY_KEY);
    const model = getStorageItem(MODEL_KEY) || 'llama-3.3-70b-versatile';
    
    if (apiKey) {
      settingsApiKey.value = apiKey;
    }
    settingsModel.value = model;
  }

  function hideSettingsPopup() {
    settingsPopup.classList.remove('active');
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
    
    const all = getStorageItem(STORAGE_KEY) || {};
    delete all[chatId];
    setStorageItem(STORAGE_KEY, all);
    
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
    content.setAttribute('title', isUser ? 'User message' : 'Click to copy');
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

  // AI Response function using Groq API
  async function getAIResponse(question, messages, includePageContext = false) {
    // Get API key from storage
    const apiKey = getStorageItem(API_KEY_KEY);
    const model = getStorageItem(MODEL_KEY) || 'llama-3.3-70b-versatile';

    if (!apiKey) {
      return "Please set your Groq API key in the settings first.";
    }

    // Get page context if requested (simplified for web version)
    let pageContext = null;
    if (includePageContext) {
      pageContext = {
        title: document.title,
        url: window.location.href,
        content: document.body.innerText || document.body.textContent || ''
      };
    }

    try {
      // Build the messages array
      let systemMessage = 'You are QuixAnswer, a helpful AI assistant that provides quick, concise, and simple answers. Keep responses brief and to the point.';
      
      // If we have page context, add it to the system message
      if (pageContext) {
        systemMessage += `\n\nThe user is currently viewing this webpage:\nTitle: ${pageContext.title}\nURL: ${pageContext.url}\nContent: ${pageContext.content}`;
      }

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            ...(Array.isArray(messages) && messages.length > 0
              ? messages
              : [{ role: 'user', content: question }])
          ],
          max_tokens: 500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error('AI Response error:', error);
      return `Error: ${error.message}`;
    }
  }

  // Title generation using Groq API
  async function generateChatTitle(userMessage, assistantMessage) {
    // Get API key from storage
    const apiKey = getStorageItem(API_KEY_KEY);
    const model = getStorageItem(MODEL_KEY) || 'llama-3.3-70b-versatile';

    if (!apiKey) {
      return 'New Chat';
    }

    try {
      const system = 'You generate concise, descriptive chat titles. Respond with ONLY the title, no quotes, no punctuation at the end. Title Case. Aim for 3-7 words.';
      const prompt = `User: ${userMessage}\nAssistant: ${assistantMessage}\n\nTitle:`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: prompt }
          ],
          max_tokens: 16,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      let title = (data.choices?.[0]?.message?.content || '').trim();
      // Post-process to a single line and trim quotes
      title = title.replace(/\s+/g, ' ');
      title = title.replace(/^"|"$/g, '');
      if (!title) title = 'New Chat';
      return title;
    } catch (error) {
      console.error('Title generation error:', error);
      return 'New Chat';
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

    // Prepare history and send to AI
    const prior = await loadHistory();
    const context = [...prior, userMsg];
    await saveHistory(context);

    // Check if we should include webpage context
    const includeContext = includeContextToggle && includeContextToggle.checked;

    try {
      const response = await getAIResponse(question, context, includeContext);
      
      removeLoadingMessage(loadingMsg);
      sendBtn.disabled = false;
      
      const aiMsg = addMessage(response, false);
      const updated = [...context, aiMsg];
      await saveHistory(updated);
      
      // Generate title after first exchange
      const firstUser = updated.find(m => m.role === 'user');
      const assistants = updated.filter(m => m.role === 'assistant');
      const firstAssistant = assistants.find(m => m.content !== 'How can I help?');
      if (firstUser && firstAssistant && updated.length <= 3) {
        try {
          const title = await generateChatTitle(firstUser.content, firstAssistant.content);
          const all = getStorageItem(STORAGE_KEY) || {};
          const chatId = getCurrentChatId();
          const entry = all[chatId];
          if (entry && !Array.isArray(entry)) {
            entry.title = title;
            all[chatId] = entry;
            setStorageItem(STORAGE_KEY, all);
            await updateHistoryList();
          }
        } catch (error) {
          console.error('Title generation failed:', error);
        }
      }
      
      // Focus back on input
      input.focus();
    } catch (error) {
      removeLoadingMessage(loadingMsg);
      sendBtn.disabled = false;
      addMessage(`Error: ${error.message}`, false);
      input.focus();
    }
  }

  // Event listeners
  sendBtn.addEventListener('click', sendMessage);
  
  input.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 160) + 'px';
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Load and save toggle state
  const savedToggleState = getStorageItem(CONTEXT_TOGGLE_KEY);
  if (includeContextToggle && savedToggleState !== null) {
    includeContextToggle.checked = savedToggleState;
  }
  
  // Save toggle state when changed
  if (includeContextToggle) {
    includeContextToggle.addEventListener('change', () => {
      setStorageItem(CONTEXT_TOGGLE_KEY, includeContextToggle.checked);
    });
  }

  // Settings popup event listeners
  if (historySettingsBtn) {
    historySettingsBtn.addEventListener('click', showSettingsPopup);
  }

  if (settingsCloseBtn) {
    settingsCloseBtn.addEventListener('click', hideSettingsPopup);
  }

  if (settingsPopup) {
    settingsPopup.addEventListener('click', (e) => {
      if (e.target === settingsPopup) {
        hideSettingsPopup();
      }
    });
  }

  if (settingsSaveBtn) {
    settingsSaveBtn.addEventListener('click', async () => {
      const apiKey = settingsApiKey.value.trim();
      const model = settingsModel.value;

      if (!apiKey) {
        showSettingsStatus('Please enter an API key', 'error');
        return;
      }

      if (!apiKey.startsWith('gsk_')) {
        showSettingsStatus('Invalid Groq API key format (should start with gsk_)', 'error');
        return;
      }

      try {
        setStorageItem(API_KEY_KEY, apiKey);
        setStorageItem(MODEL_KEY, model);
        showSettingsStatus('Settings saved successfully!', 'success');
        setTimeout(() => {
          hideSettingsPopup();
        }, 1500);
      } catch (error) {
        showSettingsStatus('Error saving settings', 'error');
      }
    });
  }

  function showSettingsStatus(message, type) {
    settingsStatus.textContent = message;
    settingsStatus.className = `status ${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        settingsStatus.style.display = 'none';
      }, 3000);
    }
  }

  // New Chat button in sidebar: create a new chat id and reset view/history
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

  // Settings button in chat history sidebar is handled above

  // Initialize the app
  async function init() {
    await initCurrentChat();
    await updateHistoryList();
    
    // Create new chat on open
    const newId = `chat_${Date.now()}`;
    await setCurrentChatId(newId);
    messagesContainer.innerHTML = '';
    addMessage('How can I help?', false);
    await saveHistory([{ role: 'assistant', content: 'How can I help?' }]);
    
    await checkApiKey();
    input.focus();
  }

  // Start the app
  init();
})();
