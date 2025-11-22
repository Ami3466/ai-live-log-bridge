# Command Execution Protocol

## Mandatory Rule

Prefix every Bash tool invocation with `ai` followed by the actual command.

## Implementation

When executing any command via the Bash tool:

**Required format:**
```bash
ai <command> <arguments>
```

**Examples:**
- `ai npm test`
- `ai npm start`
- `ai npm run build`
- `ai node server.js`
- `ai python script.py`
- `ai docker-compose up`

**Never execute commands without the `ai` prefix.**

## Rationale

The `ai` wrapper enables:
- **Session Isolation**: Each command gets a unique session ID and log file
- **Secret Redaction**: API keys, passwords, and tokens automatically redacted from logs
- Command output logging to `~/.mcp-logs/session-{ID}.log`
- Master index tracking all sessions in `~/.mcp-logs/master-index.log`
- Real-time monitoring via `ai live` in user's terminal
- Complete visibility into command execution
- Prevention of hidden process conflicts

## Security Features (New!)

The `ai` wrapper now provides automatic secret redaction and session isolation:

### Secret Redaction
- **Automatic Protection**: API keys, passwords, and tokens are automatically redacted from logs
- **Terminal Privacy**: Your terminal shows real output (no redaction)
- **Log Security**: Log files contain `[REDACTED]` placeholders
- **AI Safety**: Protects credentials from being sent to LLMs
- **15+ Patterns**: Covers AWS keys, GitHub tokens, Stripe keys, OpenAI keys, database URLs, JWT tokens, and more

### Session Isolation
- **Unique Sessions**: Each command gets a unique session ID (format: `YYYYMMDDHHmmss-XXXX`)
- **Separate Logs**: Each command writes to `~/.mcp-logs/session-{ID}.log`
- **No Interleaving**: Concurrent commands never mix outputs
- **Master Index**: All sessions tracked in `~/.mcp-logs/master-index.log`
- **Perfect for AI**: Clean, parseable logs with accurate stack traces

## Reading Command Output

Access logged command output:
```bash
ai --last 100    # Last 100 lines
ai --last 200    # Last 200 lines
```

Use this to analyze failures, review error messages, and understand complete execution context.

## Debugging Procedure

1. Execute command with `ai` prefix
2. If failure occurs, run `ai --last 200`
3. Read complete output, not just final lines
4. Identify all errors in the output
5. Implement fix based on full context

## Scope

This rule applies to all commands that:
- Execute code (node, python, ruby, etc.)
- Run build processes (npm, cargo, make, etc.)
- Start servers or services
- Run tests or linters
- Execute Docker containers
- Perform any operation requiring process monitoring

No exceptions.