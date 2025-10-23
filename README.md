# QuixAnswer Web

A modern AI chat assistant web application powered by Groq's API. This is the web version of the QuixAnswer Chrome extension, providing the same functionality in a standalone web application.

## Features

- 🤖 **AI Chat Interface**: Clean, modern chat interface with markdown support
- 💾 **Chat History**: Persistent chat history with local storage
- ⚙️ **Settings Management**: Easy API key configuration
- 🎨 **Modern UI**: Dark theme with smooth animations
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🔒 **Local Storage**: All data stored locally in your browser
- 🚀 **Fast Performance**: Optimized for speed and efficiency

## Getting Started

### Prerequisites

- A modern web browser (Chrome, Firefox, Safari, Edge)
- A Groq API key (free at [console.groq.com](https://console.groq.com/keys))

### Installation

1. **Clone or download** this repository to your local machine
2. **Navigate** to the project directory
3. **Start a local server** (required for CORS and local storage to work properly)

#### Option 1: Python (Recommended)
```bash
# Python 3
python -m http.server 8000

# Python 2
python -m SimpleHTTPServer 8000
```

#### Option 2: Node.js
```bash
# Install a simple HTTP server
npm install -g http-server

# Start the server
http-server -p 8000
```

#### Option 3: PHP
```bash
php -S localhost:8000
```

4. **Open your browser** and navigate to `http://localhost:8000`

### Configuration

1. **Click the settings button** (gear icon) in the top-right corner
2. **Enter your Groq API key** (starts with `gsk_`)
3. **Select your preferred model**:
   - Llama 3.3 70B (versatile) - Better quality responses
   - Llama-3.1-8b-instant (fast) - Faster responses
4. **Save your settings**

## Usage

### Basic Chat
- Type your question in the input field at the bottom
- Press Enter or click the send button
- The AI will respond with helpful information

### Chat History
- Click the history button (three lines) to view past conversations
- Click on any conversation to continue it
- Delete conversations you no longer need

### New Chat
- Click the "+" button to start a fresh conversation
- This creates a new chat without previous context

### Webpage Context
- Toggle "Include webpage context" to let the AI know about the current page
- Useful when you want AI to help with content from the current website

## File Structure

```
quixanswer-web/
├── index.html          # Main application page
├── settings.html       # Settings configuration page
├── app.js             # Main application logic
├── styles.css         # Application styles
├── README.md          # This file
└── icons/             # Application icons
    ├── icon.png
    └── icon.svg
```

## API Integration

This application uses the Groq API for AI responses. The API calls are made directly from the browser to:

- **Chat Completions**: `https://api.groq.com/openai/v1/chat/completions`
- **Title Generation**: Uses the same endpoint with different parameters

### Supported Models
- `llama-3.3-70b-versatile` - High-quality responses
- `llama-3.1-8b-instant` - Fast responses

## Data Storage

All data is stored locally in your browser using `localStorage`:

- **Chat History**: `quix_chat_history`
- **Current Chat ID**: `quix_current_chat_id`
- **API Key**: `apiKey`
- **Model Preference**: `model`
- **Context Toggle**: `includePageContext`

## Browser Compatibility

- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

## Security Notes

- **API Key**: Your Groq API key is stored locally in your browser
- **No Server**: This application runs entirely in your browser
- **HTTPS Recommended**: For production use, serve over HTTPS
- **CORS**: The application makes direct API calls to Groq (CORS enabled)

## Development

### Local Development
```bash
# Start development server
npm run dev
# or
python -m http.server 8000
```

### Customization
- Modify `styles.css` for visual changes
- Update `app.js` for functionality changes
- Edit `index.html` for structure changes

## Troubleshooting

### Common Issues

1. **"Please set your Groq API key"**
   - Go to Settings and enter your API key
   - Make sure it starts with `gsk_`

2. **"API request failed"**
   - Check your internet connection
   - Verify your API key is correct
   - Ensure you have API credits remaining

3. **Chat history not saving**
   - Make sure you're running on a local server (not file://)
   - Check browser console for errors
   - Try clearing browser data and re-entering settings

4. **CORS errors**
   - Make sure you're running on a local server
   - Don't open the HTML file directly in the browser

### Browser Console
Open browser developer tools (F12) to see any error messages that might help diagnose issues.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- Check the troubleshooting section above
- Open an issue on GitHub
- Review the browser console for error messages

## Changelog

### Version 1.0.0
- Initial web version release
- Full chat functionality
- Settings management
- Chat history
- Modern UI/UX
- Local storage integration