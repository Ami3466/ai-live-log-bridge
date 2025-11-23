# AI Live Terminal Bridge - Browser Monitor Extension

This Chrome extension captures browser console logs and network activity from localhost pages and streams them to the AI Live Terminal Bridge MCP server.

## Features

- ✅ Captures all console logs (log, info, warn, error, debug)
- ✅ Monitors network requests (fetch, XMLHttpRequest)
- ✅ Captures JavaScript errors and stack traces
- ✅ Tracks performance metrics
- ✅ **Localhost only** - Only monitors localhost:* and 127.0.0.1:* for security
- ✅ **No UI** - Runs silently in the background
- ✅ **Automatic secret redaction** - Cookies, tokens, and API keys are redacted before reaching the AI

## Installation

### Step 1: Build the Main Project

```bash
cd ~/Desktop/ai-live-terminal-bridge
npm install
npm run build
```

### Step 2: Install Native Messaging Host

```bash
npm run install-native-host
```

### Step 3: Load the Extension in Chrome

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable **Developer mode** (toggle in top right corner)
3. Click **Load unpacked**
4. Select this folder: `~/Desktop/ai-live-terminal-bridge-extension`
5. The extension should now appear in your extensions list

### Step 4: Update Native Host Manifest (Important!)

After loading the extension:

1. Copy the **Extension ID** from `chrome://extensions/` (it looks like: `abcdefghijklmnopqrstuvwxyz123456`)
2. Open the native messaging host manifest file:
   - **macOS**: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.ai_live_terminal_bridge.browser_monitor.json`
   - **Linux**: `~/.config/google-chrome/NativeMessagingHosts/com.ai_live_terminal_bridge.browser_monitor.json`
3. Replace `YOUR_EXTENSION_ID` with your actual extension ID in the `allowed_origins` field

Example:
```json
{
  "name": "com.ai_live_terminal_bridge.browser_monitor",
  "description": "AI Live Terminal Bridge - Browser Monitoring Host",
  "path": "/path/to/project/dist/browser/native-host.js",
  "type": "stdio",
  "allowed_origins": [
    "chrome-extension://abcdefghijklmnopqrstuvwxyz123456/"
  ]
}
```

## Usage

Once installed, the extension automatically:

1. Monitors all localhost pages you visit
2. Captures console logs, network requests, and errors
3. Sends them to the native messaging host
4. MCP server stores them in `~/.mcp-logs/browser/`
5. AI can read them using the `view_browser_logs` MCP tool

## Testing

1. Run a development server:
   ```bash
   ai npm run dev
   ```

2. Open `http://localhost:3000` (or your dev server port) in Chrome

3. Open DevTools (F12) and run:
   ```javascript
   console.log('Test message');
   console.error('Test error');
   fetch('/api/test');
   ```

4. Check that logs are being captured:
   ```bash
   cat ~/.mcp-logs/browser/active/browser-*.log
   ```

## Troubleshooting

### Extension shows "Disconnected"

- Make sure the native messaging host is installed: `npm run install-native-host`
- Check that the extension ID in the manifest matches your actual extension ID
- Refresh the page

### No logs appearing

- Make sure you're on a **localhost** page (not https://, not a regular website)
- Check the extension is enabled in `chrome://extensions/`
- Look for errors in the extension's service worker console (click "Inspect views" in `chrome://extensions/`)

### Native messaging host not found

- Verify the path in the manifest file points to the correct location
- Make sure you ran `npm run build` before installing the native host
- Check the manifest file exists in the correct directory

## Security

- **Localhost only**: Only monitors localhost:* and 127.0.0.1:* pages
- **No cross-domain**: Cannot access data from other websites
- **Automatic redaction**: Cookies, tokens, and API keys are redacted before logging
- **No external connections**: All data stays on your machine

## Uninstallation

1. Remove the extension from `chrome://extensions/`
2. Delete this folder: `~/Desktop/ai-live-terminal-bridge-extension`
3. Remove the native messaging host manifest (optional):
   - **macOS**: `~/Library/Application Support/Google/Chrome/NativeMessagingHosts/com.ai_live_terminal_bridge.browser_monitor.json`
   - **Linux**: `~/.config/google-chrome/NativeMessagingHosts/com.ai_live_terminal_bridge.browser_monitor.json`

## License

MIT
