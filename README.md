# QuixAnswer - AI Chatbot Chrome Extension

QuixAnswer is a sleek AI chatbot Chrome extension that lives in Chrome's official sidebar, providing quick and simple answers to your questions. Features a beautiful floating side button for easy access.

## Features

- 🎨 **Beautiful Dark UI** - Modern, sleek interface with smooth animations
- 🔘 **Floating Side Button** - Always accessible with a click on the side button
- 📱 **Chrome Sidebar Integration** - Uses Chrome's official Side Panel API
- 🤖 **AI-Powered Responses** - Powered by Groq's lightning-fast Llama 3.3 70B model
- 💬 **Chat History** - Keep track of your conversation within each session
- ⚡ **Blazing Fast** - Groq's LPU inference for near-instant responses
- 🆓 **Free Tier Available** - Groq offers generous free tier access

## Installation

### Step 1: Get Your FREE Groq API Key

1. Visit [Groq Console](https://console.groq.com/keys)
2. Sign in or create a free account
3. Click "Create API Key"
4. Copy the key (starts with `gsk_`)

### Step 2: Create Extension Icons

You need PNG icons for the extension. You can either:

**Option A: Use an online converter**
1. Open `icons/icon.svg` 
2. Convert to PNG at [CloudConvert](https://cloudconvert.com/svg-to-png) or similar
3. Create three sizes: 16x16, 48x48, and 128x128 pixels
4. Save as `icon16.png`, `icon48.png`, and `icon128.png` in the `icons/` folder

**Option B: Use a simple placeholder**
Create simple colored squares (teal #00D4B5) at the required sizes.

### Step 3: Load the Extension

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the `QuixAnswer` folder
5. The extension should load successfully

### Step 4: Configure Your API Key

1. Click the floating button on any webpage, or click the extension icon
2. Click "Open Settings" in the side panel (or click the gear icon)
3. Paste your Groq API key (starts with `gsk_`)
4. Click "Save Settings"

## Usage

### Opening QuixAnswer

Three ways to open the sidebar:
1. **Floating Button**: Click the teal circular button on the right side of any webpage
2. **Extension Icon**: Click the QuixAnswer icon in your Chrome toolbar
3. **Settings Button**: Click the gear icon below the main button

### Asking Questions

1. Type your question in the input field at the bottom
2. Press Enter or click the send button
3. QuixAnswer will provide a quick, concise answer

### Tips for Best Results

- Ask clear, specific questions
- QuixAnswer is optimized for short, helpful answers
- Keep questions focused on one topic at a time

## File Structure

```
QuixAnswer/
├── manifest.json          # Extension configuration
├── background.js          # Service worker for API calls and side panel
├── content.js            # Floating button injection
├── sidebar.css           # Floating button styling
├── sidepanel.html        # Chrome sidebar UI
├── sidepanel.js          # Sidebar functionality
├── popup.html            # Settings popup
├── popup.js              # Settings logic
├── icons/
│   ├── icon.svg          # Source icon (convert to PNG)
│   ├── icon16.png        # Toolbar icon (16x16)
│   ├── icon48.png        # Extension management (48x48)
│   └── icon128.png       # Chrome Web Store (128x128)
├── .gitignore
└── README.md             # This file
```

## Customization

### Change Colors

Edit `sidepanel.html` (in the `<style>` section) to customize the color scheme:
- Primary color: `#00D4B5` (teal accent)
- Background: `#1a1a1a` (dark)
- Secondary background: `#2a2a2a`

For the floating button, edit `sidebar.css`:
```css
.quixanswer-main-btn {
  background: #00D4B5; /* Change this color */
}
```

### Adjust Button Position

In `sidebar.css`, modify the floating button position:
```css
#quixanswer-float-button {
  top: 50%;           /* Vertical position */
  right: 16px;        /* Distance from right edge */
}
```

### Change AI Model

In `background.js`, you can switch to a different Groq model:
```javascript
// Line ~41
model: 'llama-3.3-70b-versatile', // Other options:
// 'mixtral-8x7b-32768' - Great for long context
// 'llama-3.1-70b-versatile' - Previous Llama version
// 'gemma2-9b-it' - Lightweight and fast
```

### Adjust Response Length

In `background.js`, modify the max tokens:
```javascript
// Line ~49
max_tokens: 500, // Increase for longer responses
```

## Privacy & Security

- Your API key is stored locally in Chrome's storage (never sent to third parties)
- All AI requests go directly from your browser to Groq
- No conversation data is stored or transmitted to any other servers
- The extension only adds a floating button to pages you visit

## Troubleshooting

### Sidebar Won't Open
- Make sure the extension is enabled in `chrome://extensions/`
- Check if your browser supports the Side Panel API (Chrome 114+)
- Try clicking the extension icon in the toolbar

### Floating Button Not Showing
- Refresh the page
- Check if the extension is enabled
- Some special Chrome pages (chrome://, chrome-extension://) don't allow content scripts

### API Errors
- Verify your API key is valid at [Groq Console](https://console.groq.com/keys)
- Check your Groq account hasn't exceeded rate limits
- Ensure you're connected to the internet
- Groq API key should start with `gsk_`

### Extension Not Loading
- Verify all icon files (PNG) are present in the `icons/` folder
- Check the console in `chrome://extensions/` for errors
- Make sure you have Chrome version 114 or later (for Side Panel API)

## Browser Compatibility

- **Chrome**: 114+ (Side Panel API requirement)
- **Edge**: 114+ (Chromium-based)
- **Brave**: 114+ (Chromium-based)
- Other Chromium browsers with Side Panel API support

## Technical Details

- **Manifest Version**: 3
- **Permissions**: Storage, Active Tab, Side Panel
- **AI Provider**: Groq (groq.com)
- **Default Model**: Llama 3.3 70B Versatile (customizable)
- **Side Panel API**: Chrome's official sidebar implementation
- **Inference Speed**: Lightning-fast with Groq's LPU technology

## What's New

### Version 1.0.0
- ✨ Chrome Side Panel integration
- 🔘 Floating side button (instead of hover trigger)
- 🎨 Beautiful dark theme UI
- ⚡ Groq API integration with Llama 3.3 70B
- 🆓 Free tier support
- ⚙️ Easy settings configuration

## Credits

- Designed and developed for quick, efficient AI assistance
- Uses Chrome's official Side Panel API
- Powered by Groq's lightning-fast LPU inference
- AI Models: Llama 3.3 70B and others from Groq

## License

This extension is provided as-is for personal and educational use.

---

**Enjoy QuixAnswer!** If you have any questions or need help, just ask QuixAnswer itself! 😊
