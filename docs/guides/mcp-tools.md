# MCP Tools Reference Guide

This guide explains all 7 MCP tools available to your AI assistant when using AI Live Log Bridge.

---

## Terminal Monitoring Tools

### 1. `view_logs`

**What it does:** Shows all recent terminal output from commands currently running in the current project.

**When to use:**
- "What's in the logs?"
- "Show me recent terminal output"
- "What commands are running?"

**How it works:**
- ✅ Only shows **LIVE/ACTIVE** sessions (currently running commands)
- ✅ Automatically filtered to **current project** directory
- ❌ Completed commands are removed from view
- Returns recent output lines (default: 100 lines)

**Example:**
```
User: "What's in the terminal logs?"

AI calls: view_logs(lines=100)

AI sees:
━━━ session-20251122180530-a1b2.log ━━━
[2025-11-22T18:05:30.123Z] Session: 20251122180530-a1b2
[2025-11-22T18:05:30.123Z] Project: /Users/name/my-project
[2025-11-22T18:05:30.123Z] Command: npm run dev
================================================================================
[18:05:30] Starting development server...
[18:05:32] Server running on http://localhost:3000
[18:05:35] Compiled successfully!

AI: "Your dev server is running successfully on localhost:3000"
```

**Important:** Commands must be run with `ai` wrapper:
```bash
ai npm test     # ✅ AI can see this
npm test        # ❌ AI cannot see this
```

---

### 2. `get_crash_context`

**What it does:** Shows only errors and crashes from running commands.

**When to use:**
- "What caused the crash?"
- "Show me the errors"
- "Why did that fail?"

**How it works:**
- Same as `view_logs` but filters to show ONLY error-related lines
- Detects: stack traces, error messages, warnings, failures
- Skips normal output to focus on problems

**Example:**
```
User: "The build failed. What's the error?"

AI calls: get_crash_context(lines=100)

AI sees:
━━━ session-20251122180700-c3d4.log ━━━
Error: Module not found: Can't resolve 'react-router-dom'
  at /Users/name/my-project/src/App.tsx:2:0
Stack trace:
  - ModuleNotFoundError
  - /node_modules/webpack/lib/Compilation.js:2011:28

AI: "Build failed because react-router-dom is missing. Run: ai npm install react-router-dom"
```

---

### 3. `auto_fix_errors`

**What it does:** Automatically detects and analyzes ALL errors from running commands with specific context and fixes.

**When to use:**
- "Auto fix this"
- "Analyze all the errors"
- "What went wrong and how do I fix it?"

**How it works:**
- Scans all active command output
- Groups related errors together
- Provides specific, actionable fixes for each error
- Perfect for test failures, build errors, runtime crashes

**Example:**
```
User: "Tests failed. Can you auto-fix the errors?"

AI calls: auto_fix_errors(lines=200)

AI sees:
━━━ Detected Errors ━━━
1. TypeError: Cannot read property 'id' of undefined
   Location: src/components/UserProfile.tsx:42

2. ReferenceError: mockData is not defined
   Location: tests/api.test.ts:15

3. Error: listen EADDRINUSE: address already in use :::3000
   Location: Server startup

AI: "Found 3 errors:

1. **UserProfile.tsx:42** - Add null check:
   ```typescript
   const userId = user?.id ?? 'guest';
   ```

2. **api.test.ts:15** - Import missing mock:
   ```typescript
   import { mockData } from './fixtures/mockData';
   ```

3. **Port 3000 in use** - Kill existing process:
   ```bash
   lsof -ti:3000 | xargs kill -9
   ```

Would you like me to apply these fixes?"
```

---

### 4. `get_usage_instructions`

**What it does:** Returns comprehensive instructions on how to use AI Live Log Bridge.

**When AI uses it:**
- When confused about why no logs are visible
- When user asks "how does this work?"
- When troubleshooting setup issues

**Returns:** Complete guide including:
- How to run commands with `ai` wrapper
- Troubleshooting common issues
- Configuration options
- Security and privacy details

---

## Browser Monitoring Tools

### 5. `view_browser_logs`

**What it does:** Shows all browser console logs and network activity from localhost pages.

**When to use:**
- "What's happening in the browser?"
- "Check the console"
- "Show me network requests"

**What it captures:**
- Console logs: `console.log()`, `console.warn()`, `console.error()`, `console.debug()`
- Network requests: fetch, XMLHttpRequest with URLs, methods, status codes, timing
- JavaScript errors with full stack traces
- Performance metrics (optional)

**How it works:**
- ✅ Only captures from **localhost** pages (security feature)
- ✅ Only shows **LIVE/ACTIVE** browser sessions
- ✅ Filtered to **current project** directory
- Chrome extension must be installed and connected

**Example:**
```
User: "The API call isn't working"

AI calls: view_browser_logs(lines=100)

AI sees:
━━━ browser-20251122181000-e5f6.log ━━━
[2025-11-22T18:10:00.123Z] Browser Session: browser-20251122181000-e5f6
[2025-11-22T18:10:00.123Z] Project: /Users/name/my-project
[2025-11-22T18:10:00.123Z] URL: http://localhost:3000/dashboard
================================================================================
[18:10:05] [Console log] User clicked login button
[18:10:06] [Network] POST http://localhost:3000/api/login → 401 (234ms)
[18:10:06] [Console error] Login failed: Unauthorized
[18:10:06] [Console error] TypeError: Cannot read property 'token' of null
  at handleLoginResponse (LoginForm.tsx:45)

AI: "I see the issue. The login API is returning 401 Unauthorized, and the frontend
is trying to read response.token when the response is null.

Frontend issue: Add null check at LoginForm.tsx:45
Backend issue: Check why authentication is failing (401 response)"
```

---

### 6. `get_browser_errors`

**What it does:** Shows ONLY browser errors and failed network requests (filters out normal logs).

**When to use:**
- "Any errors in the browser?"
- "Check for JavaScript errors"
- "Show failed API calls"

**What it shows:**
- `console.error()` messages only
- JavaScript exceptions with stack traces
- Failed network requests (4xx, 5xx status codes)
- Unhandled promise rejections

**Example:**
```
User: "Are there any errors in the browser?"

AI calls: get_browser_errors(lines=50)

AI sees:
━━━ browser-20251122181200-g7h8.log ━━━
[18:12:15] [Console error] Failed to fetch user data
[18:12:15] [Network] GET http://localhost:3000/api/user/123 → 404 (89ms)
[18:12:20] [Error] Uncaught TypeError: Cannot destructure property 'name' of 'undefined'
  Stack Trace:
    at UserCard.render (UserCard.tsx:28)
    at React.Component.render

AI: "Yes, two errors:

1. **404 Not Found** - GET /api/user/123 failed. User doesn't exist or endpoint is wrong.

2. **TypeError at UserCard.tsx:28** - Trying to destructure 'name' from undefined user object.
   Add null check before destructuring."
```

---

### 7. `get_browser_instructions`

**What it does:** Returns instructions for setting up and troubleshooting the browser extension.

**When AI uses it:**
- When browser logs aren't appearing
- When user asks about browser setup
- When troubleshooting connection issues

**Returns:** Guide including:
- Chrome extension installation from Chrome Web Store
- Native messaging host setup
- Connection troubleshooting
- Common error fixes

---

## Combined Usage Examples

### Example 1: Full Stack Debugging

```
User: "The user profile page isn't loading"

AI strategy:
1. Calls: view_browser_logs() - Check frontend
2. Calls: view_logs() - Check backend API server
3. Calls: get_browser_errors() - Focus on errors

AI discovers:
- Frontend: GET /api/users/profile → 500
- Backend: Database connection timeout
- Root cause: PostgreSQL not running

AI: "The database isn't running. Start it with: ai docker-compose up postgres"
```

### Example 2: Test Failure Analysis

```
User: "Tests are failing"

AI calls: auto_fix_errors(lines=300)

AI sees all test failures at once:
- 5 TypeErrors (missing null checks)
- 3 ReferenceErrors (missing imports)
- 2 timeout errors (slow API calls)

AI: "Found 10 test failures. Here are the fixes organized by type:

**Type Errors (5 instances):**
[Specific fixes for each]

**Missing Imports (3 instances):**
[Import statements needed]

**Timeouts (2 instances):**
[Increase timeout or mock slow APIs]"
```

### Example 3: Production Build Debugging

```
User: "Build is failing"

AI calls: get_crash_context(lines=200)

AI sees webpack errors and identifies:
- Circular dependency between modules
- Missing TypeScript type definitions
- CSS import path errors

AI provides step-by-step fix for each issue.
```

---

## Best Practices for AI Assistants

### 1. Start Broad, Then Narrow

```
✅ Good:
1. view_logs() - See everything
2. get_crash_context() - Focus on errors if found

❌ Inefficient:
1. get_crash_context() - Might miss context
```

### 2. Use auto_fix_errors for Multiple Errors

```
✅ Good for test failures:
auto_fix_errors(lines=300) - Sees all tests at once

❌ Less efficient:
view_logs() - User has to manually identify each error
```

### 3. Check Both Frontend and Backend

```
✅ Complete diagnosis:
1. view_browser_logs() - Frontend issues
2. view_logs() - Backend issues

Provides complete picture of full-stack problems
```

### 4. Respect Project Boundaries

All tools automatically filter to current project directory. This means:
- ✅ Multi-project setups work correctly
- ✅ No cross-contamination between projects
- ✅ Only relevant logs are shown

---

## Limitations

### What Tools Can See

**Terminal Tools:**
- ✅ Commands run with `ai` wrapper
- ❌ Commands run without `ai`
- ✅ stdout and stderr
- ✅ Exit codes and timing
- ✅ Only from current project directory

**Browser Tools:**
- ✅ localhost:* pages
- ✅ 127.0.0.1:* pages
- ❌ Regular websites (security)
- ✅ Only from current project's localhost server
- Requires Chrome extension: **[AI Live Terminal Bridge](https://chromewebstore.google.com/detail/ai-live-terminal-bridge-b/ljdggojoihiofgflmpjffflhfjejndjg)**

### Live Sessions Only

All tools show **ONLY currently running/active sessions**:
- ✅ `ai npm run dev` (still running) → Visible
- ❌ `ai npm test` (completed) → Not visible
- This keeps AI focused on current work

To see historical logs:
- Increase retention: `export AI_KEEP_LOGS=7`
- Or check logs manually: `ls ~/.mcp-logs/inactive/`

---

## Security & Privacy

### Secrets are Redacted

All tools redact secrets BEFORE the AI sees them:

```
Your terminal shows:
API_KEY=sk-1234567890abcdef

AI sees:
API_KEY=[REDACTED]
```

**Patterns redacted:**
- API keys (AWS, OpenAI, Stripe, etc.)
- Bearer tokens, JWT
- Passwords
- Private keys
- Cookies
- Authorization headers
- Session tokens

### Project Isolation

Tools are filtered by `process.cwd()`:
- AI only sees logs from current project
- No access to logs from other projects
- No cross-project data leakage

### Localhost Only (Browser)

Browser extension ONLY monitors:
- `localhost:*`
- `127.0.0.1:*`

Cannot access regular websites for privacy.

---

## Summary

| Tool | Purpose | Best For |
|------|---------|----------|
| `view_logs` | All terminal output | "What's in the logs?" |
| `get_crash_context` | Only errors | "Show me the error" |
| `auto_fix_errors` | Analyze all errors | "Auto fix this" |
| `get_usage_instructions` | How to use system | When confused |
| `view_browser_logs` | All browser activity | "Check the console" |
| `get_browser_errors` | Only browser errors | "Any errors in browser?" |
| `get_browser_instructions` | Browser setup help | Troubleshooting |

**Key Takeaway:** These tools give AI assistants complete visibility into development environments without manual copy-pasting. Always run terminal commands with `ai` wrapper and install browser extension for full coverage.
