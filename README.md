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

### Step 2: Create Extension Icon

You need a PNG icon for the extension:

1. Open `icons/icon.svg`
2. Convert to PNG using a tool like CloudConvert (https://cloudconvert.com/svg-to-png)
3. Export a 128×128 PNG and save it as `icons/icon.png`

Optional: You can add other sizes later if you update the manifest to reference them.

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

### Settings Reference

Configure these in the Settings popup:
- Groq API Key (must start with `gsk_`)
- Sidebar opener position: Top, Middle, or Bottom
- Model: `llama-3.3-70b-versatile` (default) or `llama-3.1-8b-instant`

### Change AI Model

Choose the model in the Settings popup (`popup.html`) or set a default in `background.js` (default `llama-3.3-70b-versatile`). A fast alternative is `llama-3.1-8b-instant`.

### Adjust Response Length

In `background.js`, change the `max_tokens` value in the Groq request body (default `500`). Increase for longer answers.

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
│   └── icon.png          # 128×128 icon referenced in manifest
├── .gitignore
└── README.md             # This file
```

## Technical Details

- **Manifest Version**: 3
- **Permissions**: `storage`, `activeTab`, `sidePanel`, `scripting`, `tabs`
- **Host Permissions**: `https://api.groq.com/*`, `<all_urls>`
- **AI Provider**: Groq (`groq.com`)
- **Default Model**: Llama 3.3 70B Versatile (customizable)
- **Side Panel API**: Chrome's official sidebar implementation
- **Inference Speed**: Lightning-fast with Groq's LPU technology
- **Versioning**: `YYYY.MM.DD` format (e.g., `2025.10.09`)

### Version 2025.10.09
- Manifest now includes `scripting` and `tabs` permissions
- Icons simplified to a single `icons/icon.png` (128×128)
- Settings updated: model selection and opener position