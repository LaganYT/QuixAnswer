// Content script for QuixAnswer - Floating Button
(function() {
  'use strict';

  // Check if button already exists
  if (document.getElementById('quixanswer-float-button')) {
    return;
  }

  // Create floating button container
  const floatContainer = document.createElement('div');
  floatContainer.id = 'quixanswer-float-button';
  floatContainer.innerHTML = `
    <button class="quixanswer-main-btn" id="quixanswer-open-btn" title="Open QuixAnswer">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="white"/>
        <path d="M2 17L12 22L22 17M2 12L12 17L22 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </button>
  `;

  document.body.appendChild(floatContainer);

  // Event listeners
  const openBtn = document.getElementById('quixanswer-open-btn');

  openBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
  });

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.type === 'SHOW_BUTTONS') {
      floatContainer.classList.remove('hidden');
    } else if (request.type === 'HIDE_BUTTONS') {
      floatContainer.classList.add('hidden');
    }
    sendResponse({ success: true });
    return true;
  });

})();

