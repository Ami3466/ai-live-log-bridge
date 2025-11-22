#!/usr/bin/env node

import chalk from 'chalk';
import { existsSync } from 'fs';
import { LOG_FILE, readRecentLogs, getSessionLogFiles } from '../storage.js';
import { startMCPServer } from '../server.js';
import { runCommandWrapper } from '../wrapper.js';
import { getMasterIndexPath } from '../session.js';

async function main() {
  const args = process.argv.slice(2);

  // Mode A: MCP Server (ai --server)
  // Used by Claude Desktop
  if (args.includes('--server')) {
    console.error(chalk.cyan('🚀 Starting MCP Server...'));
    await startMCPServer();
    return;
  }

  // Mode B: Live Log Viewer (ai live)
  // Watch logs in real-time from session files
  if (args[0] === 'live' || args.includes('--live') || args.includes('--watch')) {
    console.log(chalk.cyan('👀 Watching logs in real-time...'));
    console.log(chalk.gray(`📁 Session logs directory: ~/.mcp-logs/`));
    console.log(chalk.gray('Press Ctrl+C to exit\n'));
    console.log(chalk.dim('='.repeat(80)) + '\n');

    // Show recent logs first
    const recentLogs = readRecentLogs(20);
    if (recentLogs) {
      console.log(recentLogs);
      console.log('\n' + chalk.dim('='.repeat(80)) + '\n');
      console.log(chalk.cyan('📡 Watching for new sessions...\n'));
    } else {
      console.log(chalk.yellow('No log files found yet. Waiting for commands...\n'));
    }

    // Watch the master index file to detect new sessions
    const masterIndex = getMasterIndexPath();

    // Dynamic import for tail functionality
    const { spawn } = await import('child_process');

    // Watch master index with tail -f to detect new sessions
    const tail = spawn('tail', ['-f', '-n', '0', masterIndex], {
      stdio: ['ignore', 'pipe', 'inherit']
    });

    tail.stdout?.on('data', (data) => {
      const output = data.toString();
      // Extract session ID from master index line and show the full session output
      const sessionIdMatch = output.match(/\[([\d-]+)\]/);
      if (sessionIdMatch) {
        const sessionId = sessionIdMatch[1];
        console.log(chalk.cyan(`\n━━━ New Session: ${sessionId} ━━━`));
        console.log(output);

        // Also tail the actual session file
        const sessionFiles = getSessionLogFiles(1); // Get the most recent session
        if (sessionFiles.length > 0) {
          const sessionTail = spawn('tail', ['-f', '-n', '+1', sessionFiles[0]], {
            stdio: ['ignore', 'pipe', 'inherit']
          });

          sessionTail.stdout?.on('data', (sessionData) => {
            process.stdout.write(sessionData.toString());
          });

          // Store tail process for cleanup
          process.on('SIGINT', () => {
            sessionTail.kill();
          });
        }
      }
    });

    tail.on('error', (error) => {
      // If master index doesn't exist, create it and wait
      if (!existsSync(masterIndex)) {
        console.log(chalk.yellow('Waiting for first command to be executed...\n'));
      } else {
        console.error(chalk.red('Error watching logs:'), error);
        process.exit(1);
      }
    });

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(chalk.cyan('\n\n👋 Stopped watching logs'));
      tail.kill();
      process.exit(0);
    });

    return;
  }

  // Mode C: CLI Reader (ai --last)
  // Used by Claude Code / Cursor Agent - reads from session files
  if (args.includes('--last')) {
    const lastIndex = args.indexOf('--last');
    const linesArg = args[lastIndex + 1];
    let lines = linesArg && !linesArg.startsWith('-') ? parseInt(linesArg, 10) : 100;

    // Validate line count
    if (isNaN(lines) || lines < 1) {
      console.log(chalk.yellow('Invalid line count. Using default: 100'));
      lines = 100;
    }
    if (lines > 10000) {
      console.log(chalk.yellow('Line count too large. Using maximum: 10000'));
      lines = 10000;
    }

    const sessionFiles = getSessionLogFiles();

    // Check for any logs (session files or legacy file)
    if (sessionFiles.length === 0 && !existsSync(LOG_FILE)) {
      console.log(chalk.yellow('No log file found. Run a command with `ai` first.'));
      process.exit(0);
    }

    try {
      // Use the new readRecentLogs function to read from session files
      const recentLogs = readRecentLogs(lines);

      if (recentLogs) {
        console.log(recentLogs);
      } else {
        console.log(chalk.yellow('No logs available.'));
      }

      process.exit(0);
    } catch (error) {
      console.error(chalk.red('Error reading log files:'), error);
      process.exit(1);
    }
  }

  // Mode D: Wrapper (Default)
  // Usage: ai <command>
  if (args.length === 0) {
    console.log(chalk.cyan('🤖 AI Live Terminal Bridge'));
    console.log(chalk.gray('\nUsage:'));
    console.log(chalk.white('  ai <command>           ') + chalk.gray('Run command with logging'));
    console.log(chalk.white('  ai live                ') + chalk.gray('Watch logs in real-time (Ctrl+C to exit)'));
    console.log(chalk.white('  ai --last [lines]      ') + chalk.gray('Read last N lines (default: 100)'));
    console.log(chalk.white('  ai --server            ') + chalk.gray('Start MCP server (for Claude Desktop)'));
    console.log(chalk.gray('\nExamples:'));
    console.log(chalk.white('  ai npm start           ') + chalk.gray('# Run with logging'));
    console.log(chalk.white('  ai live                ') + chalk.gray('# Watch logs live'));
    console.log(chalk.white('  ai --last 50           ') + chalk.gray('# Read last 50 lines'));
    console.log(chalk.gray('\nLog file: ') + chalk.white(LOG_FILE));
    process.exit(0);
  }

  // Run command with wrapper
  const command = args[0];
  const commandArgs = args.slice(1);

  console.log(chalk.cyan(`🤖 Starting command`));
  console.log(chalk.gray(`   Command: ${command} ${commandArgs.join(' ')}\n`));

  try {
    await runCommandWrapper(command, commandArgs);
  } catch (error) {
    console.error(chalk.red(`\n❌ Command failed`));
    if (error instanceof Error) {
      console.error(chalk.red(`   Error: ${error.message}`));
    }
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});
