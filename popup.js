// Popup script for QuixAnswer settings
document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const openerPositionSelect = document.getElementById('openerPosition');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  // Load saved API key
  const result = await chrome.storage.local.get(['apiKey', 'openerPosition']);
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
  }
  if (result.openerPosition) {
    openerPositionSelect.value = result.openerPosition;
  } else {
    openerPositionSelect.value = 'middle';
  }

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const openerPosition = openerPositionSelect.value;

    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    if (!apiKey.startsWith('gsk_')) {
      showStatus('Invalid Groq API key format (should start with gsk_)', 'error');
      return;
    }

    try {
      await chrome.storage.local.set({ apiKey, openerPosition });
      showStatus('Settings saved successfully!', 'success');
    } catch (error) {
      showStatus('Error saving settings', 'error');
    }
  });

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    
    if (type === 'success') {
      setTimeout(() => {
        status.style.display = 'none';
      }, 3000);
    }
  }
});

