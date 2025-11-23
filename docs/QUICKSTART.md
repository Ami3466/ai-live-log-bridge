# AI Live Log Bridge - Quick Start Guide

**Stop copying and pasting logs. Give your AI complete visibility into your development environment.**

This guide will get you up and running in 5 minutes.

---

## What Does This Do?

AI Live Log Bridge gives your AI assistant **automatic access** to:
- ✅ Terminal output from commands you run
- ✅ Browser console logs from localhost pages
- ✅ Network requests (fetch, XHR)
- ✅ JavaScript errors with stack traces

**No more "can you check the terminal?" or "what does the console say?"**

---

## Part 1: Terminal Monitoring (Required)

### Step 1: Install

```bash
npm install -g ai-live-log-bridge
```

### Step 2: Configure Your AI Tool

Pick your AI tool and add the MCP configuration:

#### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-live-log-bridge": {
      "command": "ai",
      "args": ["--server"]
    }
  }
}
```

**Restart Claude Desktop completely.**

#### Cursor

Settings → Features → Model Context Protocol:

```json
{
  "ai-live-log-bridge": {
    "command": "ai",
    "args": ["--server"]
  }
}
```

**Restart Cursor.**

#### Windsurf

Navigate to MCP configuration in settings:

```json
{
  "ai-live-log-bridge": {
    "command": "ai",
    "args": ["--server"]
  }
}
```

**Restart Windsurf.**

### Step 3: Use It!

**CRITICAL:** Always run terminal commands with the `ai` wrapper:

```bash
# ❌ WRONG - AI can't see this
npm test

# ✅ CORRECT - AI can read the output automatically
ai npm test
```

**Examples:**
```bash
ai npm run dev
ai npm test
ai python manage.py runserver
ai docker-compose up
ai go run main.go
```

### Step 4: Verify It Works

1. Run a command with `ai`:
   ```bash
   ai echo "Hello AI"
   ```

2. Ask your AI:
   ```
   What's in the terminal logs?
   ```

3. Your AI should respond with the output automatically - no copy-pasting!

---

## Part 2: Browser Monitoring (Optional but Powerful)

This lets your AI see browser console logs and network requests from localhost.

### Step 1: Download the Chrome Extension

```bash
npm run download-extension
```

This downloads the extension to `~/.ai-live-log-bridge-extension`

### Step 2: Install Native Host

```bash
npm run install-native-host
```

### Step 3: Load Chrome Extension

1. Open Chrome → `chrome://extensions/`
2. Enable **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select folder: `~/.ai-live-log-bridge-extension`
5. **Copy the Extension ID** (32 characters under the extension name)

### Step 4: Connect Extension to Native Host

Run this command with YOUR extension ID from step 3:

```bash
npm run update-extension-id YOUR_EXTENSION_ID_HERE
```

Example:
```bash
npm run update-extension-id abcdefghijklmnopqrstuvwxyz123456
```

### Step 5: Test Browser Monitoring

1. **Restart Chrome completely** (quit and reopen)
2. Navigate to: `http://localhost:3000` (any localhost page)
3. Open DevTools (F12) → Console
4. Type: `console.log("Test from browser")`
5. Ask your AI:
   ```
   Check the browser console for any messages
   ```

Your AI should see the console message automatically!

---

## How To Use

### For Terminal Commands

**Always use `ai` wrapper:**
```bash
ai npm test          # AI sees test results
ai npm run build     # AI sees build output
ai npm start         # AI sees server logs
```

### Ask Your AI

Your AI now has these MCP tools available:

**Terminal Tools:**
- `view_logs` - See all recent terminal output
- `get_crash_context` - See only errors and crashes
- `auto_fix_errors` - Detect and analyze all errors automatically
- `get_usage_instructions` - Get help using the system

**Browser Tools** (if extension installed):
- `view_browser_logs` - See console logs and network requests
- `get_browser_errors` - See only browser errors and failed requests
- `get_browser_instructions` - Get help with browser setup

### Example Workflows

**Debugging a test failure:**
```bash
# You run:
ai npm test

# You ask:
"The tests failed. Can you auto-fix the errors?"

# AI calls: auto_fix_errors
# AI responds with specific fixes for each failure
```

**Debugging a frontend bug:**
```bash
# You run:
ai npm run dev

# You open localhost:3000 in Chrome, click a button, error occurs

# You ask:
"The login button isn't working"

# AI calls: view_browser_logs and view_logs
# AI sees both frontend and backend errors
# AI provides complete diagnosis
```

**Hidden terminal problem:**
```bash
# AI runs something in background:
ai npm run dev

# You try to start your app:
npm start  # Error: EADDRINUSE port 3000

# You ask:
"What's running on port 3000?"

# AI calls: view_logs
# AI responds: "Your dev server is running on port 3000 (started 5 minutes ago)"
```

---

## Troubleshooting

### Terminal: "ai: command not found"

**Solution:** Restart your terminal or run:
```bash
hash -r    # Bash/Zsh
rehash     # Fish
```

### Terminal: AI can't see my logs

**Problem:** You forgot to use `ai` wrapper

**Solution:** Always prefix commands with `ai`:
```bash
ai npm test  # ✅ Logged
npm test     # ❌ Not logged
```

### Browser: Extension shows "Disconnected"

**Solutions:**
1. Verify extension downloaded: `ls ~/.ai-live-log-bridge-extension/manifest.json`
2. Verify you ran: `npm run update-extension-id <ID>`
3. Check the extension ID is correct
4. **Restart Chrome completely** (quit and reopen)
5. Refresh the localhost page

### Browser: No logs appearing

**Solutions:**
1. Make sure you're on a **localhost** page (not regular websites)
2. Extension only monitors `localhost:*` and `127.0.0.1:*`
3. Check extension is enabled in `chrome://extensions/`
4. Check extension background console for errors:
   - Go to `chrome://extensions/`
   - Click "Inspect views: service worker"
   - Look for connection errors

### Browser: "Failed to start native messaging host"

**Solutions:**
1. Verify native host installed:
   ```bash
   cat ~/Library/Application\ Support/Google/Chrome/NativeMessagingHosts/com.ai_live_log_bridge.browser_monitor.json
   ```
2. Should point to: `dist/browser/native-host` (without .js)
3. Verify wrapper exists and is executable:
   ```bash
   which ai
   ls -l $(npm root -g)/ai-live-log-bridge/dist/browser/native-host
   ```
4. Should show: `-rwx--x--x` (executable)
5. Rebuild if needed: `npm run build`

---

## Configuration

### Log Retention

Control how long logs are kept using `AI_KEEP_LOGS` environment variable:

```bash
# Add to ~/.zshrc, ~/.bashrc, or ~/.config/fish/config.fish

# Delete logs immediately when command completes (cleanest)
export AI_KEEP_LOGS=0

# Keep logs for 1 day (default)
export AI_KEEP_LOGS=1

# Keep logs for 7 days
export AI_KEEP_LOGS=7
```

**Recommendation:** Use `AI_KEEP_LOGS=0` for cleanest AI experience (only shows live/running commands).

---

## Security

### What's Monitored?

**Terminal:**
- ✅ All commands run with `ai` wrapper
- ❌ Commands run without `ai` are NOT logged

**Browser:**
- ✅ `localhost:*` pages only
- ✅ `127.0.0.1:*` pages only
- ❌ Regular websites (google.com, etc.) are NOT monitored

### Secret Redaction

Secrets are **automatically redacted** before writing to logs:

**Terminal patterns:**
- API keys (AWS, OpenAI, Stripe, etc.)
- Bearer tokens, JWT tokens
- Passwords in database URLs
- Private keys (PEM, SSH)
- Credit card numbers

**Browser patterns:**
- Cookies
- Authorization headers
- localStorage/sessionStorage tokens
- Session IDs

**How it works:**
- Your terminal shows real output
- Logs contain `[REDACTED]`
- AI never sees your secrets

---

## Manual Log Access

You can view logs manually anytime:

**Terminal logs:**
```bash
# Active/running commands
ls ~/.mcp-logs/active/
cat ~/.mcp-logs/active/session-*.log

# Completed commands (if retention > 0)
ls ~/.mcp-logs/inactive/
cat ~/.mcp-logs/inactive/session-*.log
```

**Browser logs:**
```bash
# Active browser sessions
ls ~/.mcp-logs/browser/active/
cat ~/.mcp-logs/browser/active/browser-*.log

# Completed sessions
ls ~/.mcp-logs/browser/inactive/
cat ~/.mcp-logs/browser/inactive/browser-*.log
```

---

## Next Steps

1. **Start using `ai` for all commands** - It becomes second nature quickly
2. **Install browser extension** - Doubles your debugging power
3. **Try auto_fix_errors** - Let AI analyze all errors at once
4. **Set log retention** - `AI_KEEP_LOGS=0` for cleanest experience

---

## Need Help?

- **Documentation:** [Full README](README.md)
- **Test Guide:** [Browser Testing](TEST-BROWSER-MONITORING.md)
- **Issues:** [GitHub Issues](https://github.com/Ami3466/ai-live-log-bridge/issues)

---

**Remember:** Run commands with `ai` and your AI assistant can see everything automatically. No more copy-paste debugging!
