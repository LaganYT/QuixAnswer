// Background service worker for QuixAnswer
chrome.runtime.onInstalled.addListener(() => {
  console.log('QuixAnswer extension installed');
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
    getAIResponse(request.question, request.messages, request.includePageContext)
      .then(response => sendResponse({ success: true, answer: response }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }

  if (request.type === 'GENERATE_CHAT_TITLE') {
    generateChatTitle(request.user, request.assistant)
      .then(title => sendResponse({ success: true, title }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
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

// Function to extract page content from the active tab
async function getPageContext() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab || !tab.id) {
      return null;
    }

    // Don't try to inject on chrome:// or extension pages
    if (tab.url && (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://'))) {
      return null;
    }

    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        // Extract meaningful text content from the page
        const title = document.title;
        const url = window.location.href;
        
        // Get main content, avoiding script tags, style tags, etc.
        const bodyClone = document.body.cloneNode(true);
        
        // Remove unwanted elements
        const unwantedSelectors = ['script', 'style', 'noscript', 'iframe', 'nav', 'footer', 'header'];
        unwantedSelectors.forEach(selector => {
          bodyClone.querySelectorAll(selector).forEach(el => el.remove());
        });
        
        // Get text content and clean it up
        let text = bodyClone.innerText || bodyClone.textContent || '';
        
        // Clean up whitespace
        text = text.replace(/\s+/g, ' ').trim();
        
        // Limit to first 3000 characters to avoid token limits
        text = text.substring(0, 3000);
        
        return {
          title,
          url,
          content: text
        };
      }
    });

    if (results && results[0] && results[0].result) {
      return results[0].result;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting page context:', error);
    return null;
  }
}

// AI Response function using Groq API
async function getAIResponse(question, messages, includePageContext = false) {
  // Get API key from storage
  const result = await chrome.storage.local.get(['apiKey']);
  const apiKey = result.apiKey;

  if (!apiKey) {
    return "Please set your Groq API key in the extension settings first.";
  }

  // Get page context if requested
  let pageContext = null;
  if (includePageContext) {
    pageContext = await getPageContext();
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
        model: 'llama-3.3-70b-versatile', // Fast and powerful Groq model
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
  const result = await chrome.storage.local.get(['apiKey']);
  const apiKey = result.apiKey;

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
        model: 'llama-3.3-70b-versatile',
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

