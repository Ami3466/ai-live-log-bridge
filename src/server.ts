#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { existsSync } from 'fs';
import { LOG_FILE, readRecentLogs, getSessionLogFiles } from './storage.js';
import { readRecentBrowserLogs, getBrowserSessionLogFiles } from './browser/browser-storage.js';

/**
 * MCP Server Mode
 * Used by any MCP-compatible AI tool (Claude Desktop, Claude Code, Cursor, Windsurf, etc.)
 * Speaks MCP protocol over stdio
 */
export async function startMCPServer(): Promise<void> {
  const server = new Server(
    {
      name: 'ai-live-log-bridge',
      version: '1.3.2',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Define the tools
  const tools: Tool[] = [
    {
      name: 'view_logs',
      description: 'View LIVE terminal session logs for the CURRENT PROJECT only. Shows ONLY currently running commands - completed commands are automatically removed.\n\nAutomatically filters to show:\n- ✅ Only sessions from the current working directory\n- ✅ Only LIVE/ACTIVE sessions (running commands)\n- ❌ Completed sessions are auto-deleted\n\nUse this to monitor what commands are currently running and their real-time output.\n\nIMPORTANT: All terminal commands MUST be executed using the \'ai\' wrapper (e.g., \'ai npm test\', \'ai npm start\', \'ai python script.py\'). This ensures commands appear in logs and in the user\'s live viewer. Commands run without \'ai\' will NOT be logged.',
      inputSchema: {
        type: 'object',
        properties: {
          lines: {
            type: 'number',
            description: 'Number of recent lines to read (default: 100)',
          },
        },
      },
    },
    {
      name: 'get_crash_context',
      description: 'Read crash context and debug errors from LIVE sessions for the CURRENT PROJECT only. Shows ONLY currently running commands.\n\nAutomatically filters to show:\n- ✅ Only sessions from the current working directory\n- ✅ Only LIVE/ACTIVE sessions (running commands)\n- ❌ Completed sessions are auto-deleted\n\nUse this when investigating crashes or errors in currently running commands.\n\nIMPORTANT: All terminal commands MUST be executed using the \'ai\' wrapper (e.g., \'ai npm test\', \'ai npm start\', \'ai python script.py\'). This ensures commands appear in logs and in the user\'s live viewer. Commands run without \'ai\' will NOT be logged.',
      inputSchema: {
        type: 'object',
        properties: {
          lines: {
            type: 'number',
            description: 'Number of recent lines to read (default: 100)',
          },
        },
      },
    },
    {
      name: 'auto_fix_errors',
      description: 'Automatically detect and analyze errors from LIVE sessions for the CURRENT PROJECT only. Shows ONLY currently running commands.\n\nAutomatically filters to show:\n- ✅ Only sessions from the current working directory\n- ✅ Only LIVE/ACTIVE sessions (running commands)\n- ❌ Completed sessions are auto-deleted\n\nUse this when debugging errors in currently running commands. Returns detected errors with context and suggestions.\n\nIMPORTANT: All terminal commands MUST be executed using the \'ai\' wrapper (e.g., \'ai npm test\', \'ai npm start\', \'ai python script.py\'). This ensures commands appear in logs and in the user\'s live viewer. Commands run without \'ai\' will NOT be logged.',
      inputSchema: {
        type: 'object',
        properties: {
          lines: {
            type: 'number',
            description: 'Number of recent lines to analyze (default: 200)',
          },
        },
      },
    },
    {
      name: 'get_usage_instructions',
      description: 'Get comprehensive instructions on how to properly use the ai-live-log-bridge system. Call this tool to understand the critical requirement to run all commands with the \'ai\' wrapper.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'view_browser_logs',
      description: 'View LIVE browser console logs and network activity for the CURRENT PROJECT only. Shows ONLY currently active browser sessions.\n\nAutomatically filters to show:\n- ✅ Only sessions from the current working directory\n- ✅ Only LIVE/ACTIVE browser sessions\n- ❌ Completed sessions are auto-deleted\n\nCaptures:\n- Console logs (log, warn, error, debug)\n- Network requests (URL, method, status, timing)\n- JavaScript errors with stack traces\n- Performance metrics\n\nIMPORTANT: User must have the Chrome extension installed and connected. The extension captures browser activity from localhost:* pages only.',
      inputSchema: {
        type: 'object',
        properties: {
          lines: {
            type: 'number',
            description: 'Number of recent lines to read (default: 100)',
          },
        },
      },
    },
    {
      name: 'get_browser_errors',
      description: 'View ONLY browser errors and failed network requests for the CURRENT PROJECT. Shows console errors, JavaScript exceptions, and HTTP errors from LIVE browser sessions.\n\nAutomatically filters to show:\n- ✅ Only error-level logs (console.error, exceptions)\n- ✅ Only failed network requests (4xx, 5xx status codes)\n- ✅ Only from current working directory\n- ✅ Only LIVE/ACTIVE sessions\n\nUse this when debugging browser-side issues or API failures.\n\nIMPORTANT: User must have the Chrome extension installed and connected.',
      inputSchema: {
        type: 'object',
        properties: {
          lines: {
            type: 'number',
            description: 'Number of recent lines to analyze (default: 100)',
          },
        },
      },
    },
    {
      name: 'get_browser_instructions',
      description: 'Get comprehensive instructions on how to install and use the browser monitoring Chrome extension. Includes setup steps, troubleshooting, and usage guide.',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ];

  // Handle list tools
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools,
  }));

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'view_logs') {
        const lines = (args?.lines as number) || 100;

        const sessionFiles = getSessionLogFiles(undefined, process.cwd(), true);

        // Check if we have any logs (session files or legacy file)
        if (sessionFiles.length === 0 && !existsSync(LOG_FILE)) {
          return {
            content: [
              {
                type: 'text',
                text: 'No log file found. Run a command with `ai` first.',
              },
            ],
          };
        }

        // Use the new readRecentLogs function to read from session files
        const recentLines = readRecentLogs(lines, 10, process.cwd(), true);

        return {
          content: [
            {
              type: 'text',
              text: recentLines || 'Log file is empty.',
            },
          ],
        };
      }

      if (name === 'get_crash_context') {
        const lines = (args?.lines as number) || 100;

        const sessionFiles = getSessionLogFiles(undefined, process.cwd(), true);

        // Check if we have any logs (session files or legacy file)
        if (sessionFiles.length === 0 && !existsSync(LOG_FILE)) {
          return {
            content: [
              {
                type: 'text',
                text: 'No log file found. Run a command with `ai` first.',
              },
            ],
          };
        }

        // Use the new readRecentLogs function to read from session files
        const content = readRecentLogs(lines, 10, process.cwd(), true);
        const recentLines = content.split('\n');

        // Error detection patterns (same as auto_fix_errors)
        const errorPatterns = [
          /\berror:/i,
          /\bError\b/,
          /\bexception:/i,
          /\bException\b/,
          /\bfailed\b/i,
          /\bTypeError\b/,
          /\bSyntaxError\b/,
          /\bReferenceError\b/,
          /Process exited with code: [^0]/,
          /^\s+at\s+/,  // Stack trace lines
        ];

        // Filter to only error-related lines
        const errorLines: string[] = [];
        recentLines.forEach((line: string) => {
          for (const pattern of errorPatterns) {
            if (pattern.test(line)) {
              errorLines.push(line);
              break;
            }
          }
        });

        if (errorLines.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '✅ No errors or crashes detected in the recent logs.\n\nThe session log looks clean! If you want to see all logs (not just errors), use the view_logs tool instead.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Crash Context (Errors Only)\n\nFound ${errorLines.length} error-related line(s):\n\n\`\`\`\n${errorLines.join('\n')}\n\`\`\`\n\nFor full logs including non-error output, use the view_logs tool.`,
            },
          ],
        };
      }

      if (name === 'auto_fix_errors') {
        const lines = (args?.lines as number) || 200;

        const sessionFiles = getSessionLogFiles(undefined, process.cwd(), true);

        // Check if we have any logs (session files or legacy file)
        if (sessionFiles.length === 0 && !existsSync(LOG_FILE)) {
          return {
            content: [
              {
                type: 'text',
                text: 'No log file found. Run a command with `ai` first.',
              },
            ],
          };
        }

        // Use the new readRecentLogs function to read from session files
        const content = readRecentLogs(lines, 10, process.cwd(), true);
        const recentLines = content.split('\n');

        // Error detection patterns
        const errorPatterns = [
          /\berror:/i,
          /\bError\b/,
          /\bexception:/i,
          /\bException\b/,
          /\bfailed\b/i,
          /\bTypeError\b/,
          /\bSyntaxError\b/,
          /\bReferenceError\b/,
          /Process exited with code: [^0]/,
          /^\s+at\s+/,  // Stack trace lines
        ];

        // Find all error lines
        const errors: Array<{ line: string; index: number; type: string }> = [];
        recentLines.forEach((line: string, index: number) => {
          for (const pattern of errorPatterns) {
            if (pattern.test(line)) {
              let errorType = 'Unknown Error';
              if (/\berror:/i.test(line)) errorType = 'Error';
              if (/\bException\b/.test(line)) errorType = 'Exception';
              if (/\bTypeError\b/.test(line)) errorType = 'TypeError';
              if (/\bSyntaxError\b/.test(line)) errorType = 'SyntaxError';
              if (/\bfailed\b/i.test(line)) errorType = 'Failed';
              if (/Process exited with code/.test(line)) errorType = 'Exit Code Error';
              if (/^\s+at\s+/.test(line)) errorType = 'Stack Trace';

              errors.push({ line, index, type: errorType });
              break;
            }
          }
        });

        if (errors.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '✅ No errors detected in the recent logs.\n\nThe session log looks clean!',
              },
            ],
          };
        }

        // Build error report
        let report = `🔴 Auto-Fix Analysis\n\n`;
        report += `Found ${errors.length} error indicator(s) in the last ${lines} lines.\n\n`;
        report += `Detected Issues:\n\n`;

        // Group consecutive stack traces - keep only first stack trace in a sequence
        const uniqueErrors: typeof errors = [];
        errors.forEach((error, idx) => {
          // Skip consecutive stack traces (keep only the first one)
          if (error.type === 'Stack Trace' && idx > 0 && errors[idx - 1].type === 'Stack Trace') {
            return;
          }
          uniqueErrors.push(error);
        });

        uniqueErrors.slice(0, 10).forEach((error, idx) => {
          report += `${idx + 1}. **${error.type}**\n`;
          report += `   \`\`\`\n   ${error.line.trim()}\n   \`\`\`\n\n`;
        });

        if (uniqueErrors.length > 10) {
          report += `... and ${uniqueErrors.length - 10} more error(s)\n\n`;
        }

        report += `Full Error Context:\n\n`;
        report += `\`\`\`\n${recentLines.join('\n')}\n\`\`\`\n\n`;
        report += `Suggested Next Steps:\n\n`;
        report += `1. Analyze the error messages above\n`;
        report += `2. Check the full context for root cause\n`;
        report += `3. Provide specific fixes for each issue\n`;
        report += `4. Ask if you need more context with \`get_crash_context\`\n`;

        return {
          content: [
            {
              type: 'text',
              text: report,
            },
          ],
        };
      }

      if (name === 'get_usage_instructions') {
        const instructions = `AI Live Log Bridge - Usage Instructions

🚨 CRITICAL: Running Commands

**ALL terminal commands MUST be executed using the 'ai' wrapper:**

✅ CORRECT:
- ai npm test
- ai npm start
- ai npm run build
- ai python script.py
- ai docker-compose up
- ai git status

❌ WRONG (will NOT be logged):
- npm test
- npm start
- python script.py

Why This Matters

Commands run WITHOUT the 'ai' wrapper will:
- ❌ NOT appear in logs
- ❌ NOT be visible in the user's live viewer
- ❌ NOT be readable by these MCP tools
- ❌ Break the feedback loop between you and the user

Commands run WITH the 'ai' wrapper will:
- ✅ Appear in logs immediately
- ✅ Show in the user's live viewer in real-time
- ✅ Be readable by view_logs, get_crash_context, and auto_fix_errors
- ✅ Enable proper debugging and error analysis

When to Use Each MCP Tool

1. **view_logs** - View ALL recent terminal output (commands, output, errors)
   - Use when: User asks "what's in the logs?" or "what happened?"
   - Shows: Complete session history

2. **get_crash_context** - View ONLY errors and crashes (filtered)
   - Use when: User asks "what caused the crash?" or "show me errors"
   - Shows: Only error lines, exceptions, stack traces

3. **auto_fix_errors** - Automatically detect and analyze ALL errors
   - Use when: User says "auto fix this" or "debug these errors"
   - Shows: Comprehensive error analysis with suggestions

Remember

Every time you run a terminal command, use the 'ai' wrapper. No exceptions.

Format: ai <command>

This is not optional - it's required for the system to work.`;

        return {
          content: [
            {
              type: 'text',
              text: instructions,
            },
          ],
        };
      }

      if (name === 'view_browser_logs') {
        const lines = (args?.lines as number) || 100;

        const sessionFiles = getBrowserSessionLogFiles(undefined, process.cwd(), true);

        if (sessionFiles.length === 0) {
          // Provide more detailed troubleshooting
          const setupChecks = [
            '**Setup Verification:**',
            '  1. Run: `npm run verify-browser-setup` to check your configuration',
            '',
            '**Common Issues:**',
            '  • Extension not installed → Load from chrome://extensions/',
            '  • Extension not connected → Check that native host is registered',
            '  • No localhost pages open → Extension only monitors localhost:* pages',
            '  • Extension ID not configured → Run: npm run update-extension-id <ID>',
            '',
            '**Quick Fix:**',
            '  1. Ensure project is built: `npm run build`',
            '  2. Install native host: `npm run install-native-host`',
            '  3. Get extension ID from chrome://extensions/',
            '  4. Configure ID: `npm run update-extension-id <EXTENSION_ID>`',
            '  5. Refresh localhost page in Chrome',
            '',
            'For detailed setup instructions, use the `get_browser_instructions` tool.',
          ];

          return {
            content: [
              {
                type: 'text',
                text: `❌ No Browser Logs Found\n\nNo active browser sessions detected for this project.\n\n${setupChecks.join('\n')}`,
              },
            ],
          };
        }

        const recentLines = readRecentBrowserLogs(lines, 10, process.cwd(), true);

        return {
          content: [
            {
              type: 'text',
              text: recentLines || 'Browser log file is empty.',
            },
          ],
        };
      }

      if (name === 'get_browser_errors') {
        const lines = (args?.lines as number) || 100;

        const sessionFiles = getBrowserSessionLogFiles(undefined, process.cwd(), true);

        if (sessionFiles.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '❌ No Browser Logs Found\n\nCannot check for browser errors - no active browser sessions detected.\n\n**Quick Diagnostics:**\n  1. Run: `npm run verify-browser-setup`\n  2. Check that you have a localhost page open in Chrome\n  3. Verify extension is loaded at chrome://extensions/\n\nFor installation instructions, use the `get_browser_instructions` tool.',
              },
            ],
          };
        }

        const content = readRecentBrowserLogs(lines, 10, process.cwd(), true);
        const recentLines = content.split('\n');

        // Browser error patterns
        const errorPatterns = [
          /\[Console error\]/i,
          /\[Console warn\]/i,
          /\[Error\]/i,
          /\[Network\].*\s(4\d{2}|5\d{2})\s/,  // 4xx or 5xx status codes
          /TypeError/i,
          /ReferenceError/i,
          /SyntaxError/i,
          /Stack Trace:/i,
        ];

        // Filter to only error-related lines
        const errorLines: string[] = [];
        recentLines.forEach((line: string) => {
          for (const pattern of errorPatterns) {
            if (pattern.test(line)) {
              errorLines.push(line);
              break;
            }
          }
        });

        if (errorLines.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '✅ No browser errors detected in the recent logs.\n\nNo console errors, JavaScript exceptions, or failed network requests found. If you want to see all browser logs (not just errors), use the view_browser_logs tool instead.',
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `Browser Errors (Filtered)\n\nFound ${errorLines.length} error-related line(s):\n\n\`\`\`\n${errorLines.join('\n')}\n\`\`\`\n\nFor full browser logs including non-error output, use the view_browser_logs tool.`,
            },
          ],
        };
      }

      if (name === 'get_browser_instructions') {
        const instructions = `Browser Monitoring - Installation & Usage

📦 One-Time Setup

Step 1: Download the Chrome Extension

Download the extension from the releases page or clone the repository.
The extension files need to be placed in a directory on your system.

Step 2: Load Extension in Chrome

1. Open Chrome and go to: \`chrome://extensions/\`
2. Enable "Developer mode" (toggle in top right)
3. Click "Load unpacked"
4. Select the extension directory (wherever you extracted it)
5. The extension should now appear in your extensions list

Step 3: Configure Native Messaging

Run these commands in the ai-live-log-bridge project directory:
\`\`\`bash
npm run install-native-host
npm run update-extension-id <YOUR_EXTENSION_ID>
\`\`\`

Get the extension ID from chrome://extensions (it's shown under the extension name).

Step 4: Verify Connection

1. Open Chrome DevTools (F12) on any localhost page
2. Check the extension icon - it should show "Connected"
3. If it shows "Disconnected", refresh the page

🎯 How It Works

Once installed, the extension automatically:

1. **Captures console logs** from localhost:* pages
   - console.log(), console.warn(), console.error(), etc.
   - JavaScript errors and exceptions
   - Stack traces

2. **Monitors network requests**
   - Fetch and XMLHttpRequest calls
   - HTTP status codes
   - Request/response timing
   - Failed requests (4xx, 5xx errors)

3. **Streams to MCP**
   - All data is sent to the native messaging host
   - Secrets are automatically redacted (cookies, tokens, API keys)
   - Logs are stored in ~/.mcp-logs/browser/

📋 MCP Tools Available

view_browser_logs
View all browser activity (console + network):
\`\`\`
Use when: User wants to see what's happening in the browser
Shows: Console logs, network requests, errors, performance metrics
\`\`\`

get_browser_errors
View only errors and failed requests:
\`\`\`
Use when: Debugging browser issues, API failures
Shows: Only console.error, exceptions, HTTP errors (4xx/5xx)
\`\`\`

🔍 Example Usage

**User workflow:**
1. User runs: \`ai npm run dev\` (starts localhost:3000)
2. User opens Chrome → http://localhost:3000
3. User clicks buttons, tests features
4. Extension captures all console logs and network activity
5. You can see everything via \`view_browser_logs\` or \`get_browser_errors\`

**You ask:** "Can you check the browser console for errors?"
**User response:** "Just check it yourself!"
**You do:** Use \`get_browser_errors\` tool → See all errors immediately

⚠️ Important Notes

- Extension only monitors **localhost:*** pages (for security)
- All secrets are redacted before reaching you
- Browser sessions are tied to the project directory
- Only LIVE/ACTIVE sessions are shown (completed sessions auto-archive)

🐛 Troubleshooting

**Extension not connecting?**
- Refresh the localhost page
- Check that the MCP server is running
- Verify the native messaging host is registered

**No logs appearing?**
- Make sure you're on a localhost:* page
- Check that the extension is enabled
- Look for errors in chrome://extensions

**Extension disappeared?**
- Extensions in "developer mode" can be disabled on Chrome restart
- Just re-enable it in chrome://extensions`;

        return {
          content: [
            {
              type: 'text',
              text: instructions,
            },
          ],
        };
      }

      throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  });

  // Connect to transport
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
