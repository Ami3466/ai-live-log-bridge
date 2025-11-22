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

/**
 * MCP Server Mode
 * Used by Claude Desktop - speaks MCP protocol over stdio
 */
export async function startMCPServer(): Promise<void> {
  const server = new Server(
    {
      name: 'ai-live-terminal-bridge',
      version: '1.0.0',
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
      description: 'View recent terminal session logs. Use this anytime the user wants to see what commands were run and their output, check on progress, or understand what happened. Works with or without errors. Perfect for casual log viewing.',
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
      description: 'Read the session log file specifically to get crash context and debug errors. Use this when investigating crashes, failures, or when the user asks about errors. For general log viewing, use view_logs instead.',
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
      description: 'Automatically detect and analyze errors in the session log. Use this when the user mentions errors, asks for fixes, or says "auto fix". Returns detected errors with context and suggestions.',
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

        const sessionFiles = getSessionLogFiles();

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
        const recentLines = readRecentLogs(lines);

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

        const sessionFiles = getSessionLogFiles();

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
        const content = readRecentLogs(lines);
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
              text: `# Crash Context (Errors Only)\n\nFound ${errorLines.length} error-related line(s):\n\n\`\`\`\n${errorLines.join('\n')}\n\`\`\`\n\nFor full logs including non-error output, use the view_logs tool.`,
            },
          ],
        };
      }

      if (name === 'auto_fix_errors') {
        const lines = (args?.lines as number) || 200;

        const sessionFiles = getSessionLogFiles();

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
        const content = readRecentLogs(lines);
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
        let report = `# 🔴 Auto-Fix Analysis\n\n`;
        report += `Found ${errors.length} error indicator(s) in the last ${lines} lines.\n\n`;
        report += `## Detected Issues:\n\n`;

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

        report += `## Full Error Context:\n\n`;
        report += `\`\`\`\n${recentLines.join('\n')}\n\`\`\`\n\n`;
        report += `## Suggested Next Steps:\n\n`;
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
