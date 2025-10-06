// Popup script for QuixAnswer settings
document.addEventListener('DOMContentLoaded', async () => {
  const apiKeyInput = document.getElementById('apiKey');
  const saveBtn = document.getElementById('saveBtn');
  const status = document.getElementById('status');

  // Load saved API key
  const result = await chrome.storage.local.get(['apiKey']);
  if (result.apiKey) {
    apiKeyInput.value = result.apiKey;
  }

  // Save settings
  saveBtn.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();

    if (!apiKey) {
      showStatus('Please enter an API key', 'error');
      return;
    }

    if (!apiKey.startsWith('gsk_')) {
      showStatus('Invalid Groq API key format (should start with gsk_)', 'error');
      return;
    }

    try {
      await chrome.storage.local.set({ apiKey });
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

