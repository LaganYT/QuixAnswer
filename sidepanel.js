// Side panel script for QuixAnswer
(function() {
  'use strict';

  // DOM Elements
  const input = document.getElementById('input');
  const sendBtn = document.getElementById('send-btn');
  const messagesContainer = document.getElementById('messages');
  const chatContainer = document.getElementById('chat-container');

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

  function getCurrentChatId() {
    // Single-threaded chat for now; can expand to multi-chat later
    return 'default';
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
  renderHistory().then((history) => {
    if (history.length === 0) {
      addMessage('How can I help?', false);
      saveHistory([{ role: 'assistant', content: 'How can I help?' }]);
    }
    input.focus();
  });

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

