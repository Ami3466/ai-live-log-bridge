# AI Live Terminal Bridge

A bridge between AI coding assistants and your terminal.

---

## The Problem

Modern AI coding creates a "Split Brain" terminal experience. You work in one terminal, the AI works in another, and neither side can clearly see what the other is doing.

### 1. The AI is Blind to Your Terminal

When you run code in your main terminal, the AI has zero visibility.

It cannot see your server logs, runtime errors, or test failures.

**The Pain:** You are forced into a loop of manual copy pasting just to give the AI eyes.

### 2. You are Blind to the AI's Terminal

AI tools often execute commands in hidden tabs, cramped side panes, or background threads.

It is hard to follow the live execution, catch warnings, or see the full colored output.

**The Pain:** You lose control of your environment because you can't easily monitor what the AI is actually running.

### 3. The Broken Feedback Loop

Because of these blind spots, the AI blindly assumes its code works as long as the syntax is correct.

It marks tasks as "Fixed" while your local server is crashing.

**The Pain:** You are the only one checking reality, manually bridging the gap between two disconnected worlds.

---

## The Solution

This tool creates a shared visibility layer between you and your AI assistant:

**For your terminal:**
- Wrap any command with `ai` and it logs everything cleanly to disk
- AI can read these logs via CLI commands or MCP tools
- You keep full control with colored output in your terminal

**For the AI's terminal:**
- Run `ai live` in a second terminal to watch AI commands in real-time
- See what the AI is running, catch errors early, maintain visibility

**For the feedback loop:**
- Say "Auto fix this" and the AI scans ALL errors at once
- No more copy-paste loops or scrolling through terminal output
- AI reads actual execution results, not assumptions

---

## Quick Start

Install:
```bash
npm install -g ai-live-terminal-bridge
```

Use it:
```bash
ai npm test
ai npm run dev
ai docker-compose up
ai python manage.py runserver
```

Now your terminal output is logged and AI can read it.

---

## Two Ways to Use This Tool

### CLI Mode (Works Everywhere)

No setup required. Works with Claude Code, Cursor, Windsurf, Cline, Continue, Aider, or any AI tool with terminal access.

**How it works:**
1. Run commands with `ai` wrapper: `ai npm test`
2. AI reads logs with: `ai --last` command
3. Watch live with: `ai live` in another terminal

**To enable auto-wrapping:**

Create `.prompts/ai-wrapper.md` (or `.cursorrules`, `.windsurfrules`, etc.):

```markdown
# Terminal Command Rules

Always run terminal commands using the `ai` wrapper.

Format: ai <command>

Examples:
- ai npm test
- ai npm start
- ai python script.py

When debugging, run `ai --last 200` to see recent output.
```

Ask your AI to run commands and it will automatically use the wrapper.

### MCP Mode

Faster alternative using MCP protocol. Works with any AI tool that supports MCP servers.

#### Claude Desktop Setup

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-live-terminal-bridge": {
      "command": "ai",
      "args": ["--server"]
    }
  }
}
```

Restart Claude Desktop.

#### Cursor Setup

Open Cursor Settings > Features > Model Context Protocol

Add new MCP server:

```json
{
  "ai-live-terminal-bridge": {
    "command": "ai",
    "args": ["--server"]
  }
}
```

Restart Cursor.

#### Windsurf Setup

Open Windsurf Settings and navigate to MCP configuration

Add new MCP server:

```json
{
  "ai-live-terminal-bridge": {
    "command": "ai",
    "args": ["--server"]
  }
}
```

Restart Windsurf.

#### Using MCP Mode

Create `.prompts/ai-wrapper.md` in your project (see above).

**Now you can ask:**
- "What's in the logs?" - AI calls `view_logs`
- "Auto fix this" - AI calls `auto_fix_errors`
- "What caused the crash?" - AI calls `get_crash_context`

**The difference:**
- CLI mode: AI runs `ai --last` command manually
- MCP mode: AI calls tools directly (faster, more powerful)

---

## CLI Mode vs MCP Mode

### CLI Mode

**How it works:**
1. You configure the AI to wrap commands with `ai`
2. AI runs `ai --last` to read logs
3. Everything works through terminal commands

**Advantages:**
- No MCP setup required
- Works with any AI tool that has terminal access
- Uses fewer tokens

**Disadvantages:**
- Slower - AI must manually run `ai --last` command
- More verbose - requires explicit CLI commands
- No auto-fix tool

### MCP Mode

**How it works:**
1. You configure your AI tool to load MCP server
2. AI calls tools directly: `view_logs`, `auto_fix_errors`, `get_crash_context`
3. No manual `ai --last` commands needed

**Advantages:**
- Faster - tools called directly, no CLI overhead
- Auto-fix - AI scans and analyzes all errors automatically
- Better for live conversation - AI can check logs naturally

**Disadvantages:**
- Requires MCP server configuration
- Uses more tokens than CLI mode

---

## The Three MCP Tools

When using MCP mode, Claude gets three powerful tools:

### `view_logs`

View ALL recent terminal output - unfiltered, everything.

**You ask:** "What's in the logs?"

**Claude calls:** `view_logs(lines: 100)`

**Claude sees:** Full terminal output - commands, output, success messages, errors.

**Use for:** Checking what ran, viewing command progress, understanding session history.

### `get_crash_context`

Shows ONLY errors and crashes - filters out normal output.

**You ask:** "What caused the crash?"

**Claude calls:** `get_crash_context(lines: 100)`

**Claude sees:** Only error lines, exceptions, stack traces.

**Use for:** Quick error scanning, debugging crashes, focusing on problems.

### `auto_fix_errors`

Automatically detects and analyzes ALL errors in logs.

**Detects:**
- JavaScript/TypeScript errors (TypeError, SyntaxError, ReferenceError)
- Build failures (webpack, vite, tsc)
- Test failures (jest, mocha, vitest)
- Non-zero exit codes
- Stack traces (auto-grouped, deduplicated)
- Runtime crashes

**Smart features:**
- Deduplicates repeated errors
- Groups related stack traces
- Prioritizes by severity
- Shows file paths and line numbers
- Extracts relevant code context

**You ask:** "Auto fix this"

**Claude calls:** `auto_fix_errors(lines: 200)`

**Claude responds:**
```
I found 3 errors in your test run:

1. TypeError: Cannot read property 'id' of undefined
   File: src/user.ts:42
   Fix: Add null check before accessing user.id

2. ReferenceError: 'mockData' is not defined
   File: tests/api.test.ts:15
   Fix: Import mockData from test fixtures

3. Port 3000 already in use (EADDRINUSE)
   Fix: Kill the process on port 3000 first

Would you like me to apply these fixes?
```

No scrolling. No copy-pasting. AI finds and analyzes everything.

---

## How It Works

```
You run: ai npm run dev
       ↓
Terminal shows full output (colors preserved)
       ↓
Session isolation: unique session ID (e.g., session-20251122-a3f2.log)
       ↓
Secret redaction: API_KEY=sk-xxx → [REDACTED]
       ↓
Logs written to: ~/.mcp-logs/session-20251122-a3f2.log
       ↓
AI reads via:
- CLI mode: ai --last command
- MCP mode: view_logs / get_crash_context / auto_fix_errors tools
```

### Security Features

**Automatic Secret Redaction:**
- API keys, tokens, passwords redacted before logging
- Protects AWS keys, GitHub tokens, Stripe keys, OpenAI keys, database credentials
- Your terminal shows real output, logs contain `[REDACTED]`
- Prevents secrets from being sent to AI models

**Session Isolation:**
- Each command gets unique session ID
- Concurrent commands write to separate log files
- No interleaved outputs when running multiple commands
- Perfect for running parallel processes

---

## Configuration by AI Tool

### Claude Code (VSCode Extension)

**Step 1:** Create `.prompts/ai-wrapper.md`:

```markdown
# Terminal Command Rules

Always run terminal commands using the `ai` wrapper.

Format: ai <command>

Examples:
- ai npm test
- ai npm start
- ai python script.py

When debugging, run `ai --last 200` to see recent output.
```

**Step 2 (Optional):** Copy `.prompts/settings.local.json` from this repo to auto-approve commands.

Warning: Only use in trusted projects.

**Step 3:** Ask Claude to run commands. It will automatically use `ai` wrapper.

**Step 4:** Ask Claude to check logs: "Check the logs with ai --last"

### Cursor

**Step 1:** Create `.cursorrules`:

```markdown
# Terminal Command Rules

Always run terminal commands using the `ai` wrapper.

Format: ai <command>

Examples:
- ai npm test
- ai npm start
- ai python script.py

When debugging, run `ai --last 200` to see recent output.
```

**Step 2:** Ask Cursor to run commands. It will automatically use `ai` wrapper.

**Step 3:** Ask Cursor to check logs: "Run ai --last and show me what happened"

### Windsurf

**Step 1:** Create `.windsurfrules`:

```markdown
# Terminal Command Rules

Always run terminal commands using the `ai` wrapper.

Format: ai <command>

Examples:
- ai npm test
- ai npm start
- ai python script.py

When debugging, run `ai --last 200` to see recent output.
```

**Step 2:** Ask Windsurf to run commands.

**Step 3:** Ask Windsurf to check logs: "Check ai --last to see what happened"

### Claude Desktop (macOS/Windows)

**Step 1:** Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ai-live-terminal-bridge": {
      "command": "ai",
      "args": ["--server"]
    }
  }
}
```

**Step 2:** Restart Claude Desktop.

**Step 3:** Verify: Ask Claude "What MCP tools do you have?"

You should see `view_logs`, `get_crash_context`, and `auto_fix_errors`.

**Step 4:** Run commands with `ai` and ask Claude to check logs or auto-fix errors.

### Cline (VSCode Extension)

**Step 1:** Create `.prompts/ai-wrapper.md`:

```markdown
# Terminal Command Rules

Always run terminal commands using the `ai` wrapper.

Format: ai <command>

Examples:
- ai npm test
- ai npm start
- ai python script.py

When debugging, run `ai --last 200` to see recent output.
```

**Step 2:** Cline will automatically wrap commands with `ai`.

**Step 3:** Ask Cline: "Run ai --last 100 to see the output"

### Continue (VSCode Extension)

**Step 1:** Create `.continuerules` or add to Continue config:

```markdown
# Terminal Command Rules

Always run terminal commands using the `ai` wrapper.

Format: ai <command>

Examples:
- ai npm test
- ai npm start
- ai python script.py

When debugging, run `ai --last 200` to see recent output.
```

**Step 2:** Continue will automatically wrap commands with `ai`.

**Step 3:** Ask Continue: "Check the logs with ai --last"

### Aider

**Step 1:** Create `.aider.conf.yml`:

```yaml
# Aider configuration
edit-format: whole

# Add this as a system message
system-prompt: |
  Always run terminal commands using the `ai` wrapper.

  Examples:
  - ai npm test
  - ai npm start

  When debugging, run `ai --last 200` to see recent output.
```

**Step 2:** Start Aider and ask it to run commands.

**Step 3:** In Aider chat: "Run ai --last to show recent terminal output"

### Generic Setup (Any AI Tool)

**Step 1:** Find your AI tool's rules/instructions file:
- `.cursorrules` (Cursor)
- `.windsurfrules` (Windsurf)
- `.prompts/` folder (Claude Code)
- `.aider.conf.yml` (Aider)
- `.continuerules` (Continue)
- System prompts (ChatGPT, etc.)

**Step 2:** Add these rules:

```markdown
# Terminal Command Rules

Always run terminal commands using the `ai` wrapper.

Format: ai <command>

Examples:
- ai npm test
- ai npm start
- ai python script.py

When debugging, run `ai --last 200` to see recent output.
```

**Step 3:** Test by asking your AI to run a command.

**Step 4:** Verify by asking your AI to run `ai --last`.

---

## Real-World Examples

### Example 1: Hidden Terminal Problem

**Before:**
```bash
# Claude Code runs this in a hidden terminal
npm run dev

# You try to run your app
npm start
# Error: EADDRINUSE port 3000

# You have no idea what's running
# AI can't see the hidden terminal, so it guesses
```

**After:**
```bash
# Run everything through `ai`
ai npm run dev

# Ask: "Run ai --last and tell me what's on port 3000"
# AI reads the log and sees: "Server running on http://localhost:3000"
# AI answers: "Your dev server is using port 3000"
```

### Example 2: Test Failures

**Before:**
```bash
npm test
# 15 tests fail
# You copy-paste the first error
# AI asks for more context
# You copy-paste more
# AI asks about line 47
# Repeat...
```

**After:**
```bash
ai npm test
# 15 tests fail

# You: "Auto fix this"
# AI sees ALL 15 failures at once
# AI provides comprehensive fixes

# No copy-pasting. No scrolling.
```

### Example 3: Build Debugging

**Before:**
```bash
npm run build
# Build fails
# You scroll up in terminal
# Copy the error
# Paste to AI
# AI says "can I see more context?"
# Repeat...
```

**After:**
```bash
ai npm run build
# Build fails

# You: "Check the logs"
# AI runs `ai --last`
# AI sees full build output + error + context
# AI: "The issue is in webpack config line 42..."
```

---

## Common Workflows

### Debugging Test Failures

```bash
# Run tests
ai npm test

# Tests fail? Ask:
"Auto fix this"

# AI will:
# 1. Call auto_fix_errors (MCP) or run ai --last (CLI)
# 2. Analyze all failures
# 3. Provide specific fixes with line numbers
```

### Debugging Server Crashes

```bash
# Start server
ai npm start

# Crashes? Ask:
"What happened? Check the logs"

# AI will:
# 1. Read recent logs
# 2. Identify crash cause
# 3. Suggest fixes
```

### Build Debugging

```bash
# Run build
ai npm run build

# Build fails? Ask:
"Auto fix this"

# AI finds:
# - Syntax errors
# - Type errors
# - Missing dependencies
# - Configuration issues
```

---

## FAQ

### Does this slow down my commands?

No. Overhead is less than 1ms. Commands run at full speed.

### Can I see the logs manually?

Yes:
```bash
# View all session files
ls ~/.mcp-logs/

# Read a specific session
cat ~/.mcp-logs/session-20251122-a3f2.log

# View recent logs from all sessions
ai --last 100
```

### What if I forget to use `ai`?

Those commands won't be logged. Everything still works, you just won't have logs for them.

### Does this work with Docker?

Yes. `ai docker-compose up`, `ai docker run`, etc. all work.

### Can AI assistants other than Claude use this?

Yes. Any AI with terminal access can run `ai --last` to read logs. MCP tools currently only work with Claude Desktop.

### What about CI/CD?

This is designed for local development. In CI, use native logging.

### How secure is secret redaction?

- Secrets are redacted before writing to log files
- Your terminal shows real output; only logs are redacted
- Covers 15+ secret patterns: API keys, tokens, passwords, database URLs, JWT tokens, private keys
- If a pattern is missed, you can add it to `src/redact-secrets.ts`
- Secrets never leave your machine or reach AI models

### What happens with concurrent commands?

- Each command gets a unique session ID and separate log file
- Outputs never interleave or mix together
- Example: `ai npm test` and `ai npm start` create `session-xxx.log` and `session-yyy.log`
- The `ai --last` command reads from all recent sessions

### Should I add .mcp-logs to .gitignore?

Yes. While logs are stored in your home directory (`~/.mcp-logs`), add this to your global `.gitignore`:

```bash
# Add to ~/.gitignore_global
.mcp-logs/
```

Configure global gitignore:
```bash
git config --global core.excludesfile ~/.gitignore_global
echo ".mcp-logs/" >> ~/.gitignore_global
```

---

## Troubleshooting

### `ai: command not found`

Restart your terminal:
```bash
hash -r   # Bash/Zsh
rehash    # Fish
```

### MCP tools not showing up

1. Check JSON syntax in config file
2. Run `which ai` to verify installation
3. Test: `ai --server` should start without errors
4. Restart Claude Desktop completely

### Logs not appearing

Make sure you're using `ai`:
```bash
ai npm start   # Logged
npm start      # Not logged
```

---

## Uninstall

```bash
npm uninstall -g ai-live-terminal-bridge
rm -rf ~/.mcp-logs
```

Remove from your AI tool's MCP config if added.

---

## License

MIT License - See LICENSE for details.

---

## Contributing

Issues and PRs welcome at [GitHub](https://github.com/Ami3466/ai-live-terminal-bridge).

---

**Stop coding blind. Give your AI terminal access.**
