// Background service worker for QuixAnswer
chrome.runtime.onInstalled.addListener(() => {
  console.log('QuixAnswer extension installed');
});

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Listen for messages from content script and side panel
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'OPEN_SIDE_PANEL') {
    // Get the current window ID to notify tabs
    const windowId = sender.tab ? sender.tab.windowId : undefined;
    
    chrome.sidePanel.open({ windowId: windowId })
      .then(() => {
        // Notify all tabs in the window that sidebar is open (hide buttons)
        if (windowId) {
          chrome.tabs.query({ windowId: windowId }, (tabs) => {
            tabs.forEach(tab => {
              chrome.tabs.sendMessage(tab.id, { type: 'HIDE_BUTTONS' }).catch(() => {});
            });
          });
        }
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error opening side panel:', error);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }

  if (request.type === 'OPEN_SETTINGS') {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'SIDEBAR_CLOSED') {
    // Notify all tabs in the window that sidebar is closed (show buttons)
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'SHOW_BUTTONS' }).catch(() => {});
      });
    });
    sendResponse({ success: true });
    return true;
  }
  
  if (request.type === 'GET_AI_RESPONSE') {
    getAIResponse(request.question, request.messages)
      .then(response => sendResponse({ success: true, answer: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
});

// Listen for side panel connections
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'sidepanel') {
    // When side panel disconnects, show the buttons again
    port.onDisconnect.addListener(() => {
      chrome.tabs.query({ currentWindow: true }, (tabs) => {
        tabs.forEach(tab => {
          chrome.tabs.sendMessage(tab.id, { type: 'SHOW_BUTTONS' }).catch(() => {});
        });
      });
    });
  }
});

// AI Response function using Groq API
async function getAIResponse(question, messages) {
  // Get API key from storage
  const result = await chrome.storage.local.get(['apiKey']);
  const apiKey = result.apiKey;

  if (!apiKey) {
    return "Please set your Groq API key in the extension settings first.";
  }

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile', // Fast and powerful Groq model
        messages: [
          {
            role: 'system',
            content: 'You are QuixAnswer, a helpful AI assistant that provides quick, concise, and simple answers. Keep responses brief and to the point.'
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

