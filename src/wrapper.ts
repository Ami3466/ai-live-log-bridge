import spawn from 'cross-spawn';
import { createWriteStream } from 'fs';
import stripAnsi from 'strip-ansi';
import chalk from 'chalk';
import { ensureStorageExists } from './storage.js';
import { generateSessionId, getSessionLogPath, registerSession, markSessionActive, markSessionCompleted, cleanupStaleSessions, cleanupOldInactiveLogs } from './session.js';
import { redactSecrets } from './redact-secrets.js';

/**
 * Wrapper Mode
 * Spawns a command, preserves colors, pipes to screen, strips ANSI, writes to log
 * Now with session isolation and secret redaction
 */
export async function runCommandWrapper(command: string, args: string[]): Promise<void> {
  // Ensure storage directory exists
  ensureStorageExists();

  // Clean up stale sessions based on AI_KEEP_LOGS setting
  // Default is 1 day, or use configured value
  const keepDays = parseInt(process.env.AI_KEEP_LOGS || '1', 10);
  const maxAgeMinutes = keepDays * 24 * 60; // Convert days to minutes
  cleanupStaleSessions(maxAgeMinutes);

  // Clean up old inactive logs (older than keepDays)
  // This keeps the inactive directory from growing indefinitely
  cleanupOldInactiveLogs(keepDays);

  // Generate unique session ID for this command execution
  const sessionId = generateSessionId();
  const logFilePath = getSessionLogPath(sessionId);

  // Register this session in the master index with current working directory
  const cwd = process.cwd();
  registerSession(sessionId, command, args, cwd);

  // Mark this session as active
  markSessionActive(sessionId, cwd);

  // Create log file stream for this session
  const logStream = createWriteStream(logFilePath, { flags: 'w' }); // 'w' = new file

  // Write header to log file with project directory
  const timestamp = new Date().toISOString();
  const fullCommand = `${command} ${args.join(' ')}`;
  const header = `${'='.repeat(80)}\n[${timestamp}] Session: ${sessionId}\n[${timestamp}] Project: ${cwd}\n[${timestamp}] Command: ${fullCommand}\n${'='.repeat(80)}\n`;
  logStream.write(header);

  // Show session ID to user
  console.log(chalk.dim(`[Session: ${sessionId}]`));

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: false,
      env: { ...process.env }
    });

    // Track if we have pending writes
    let hasError = false;
    let streamClosed = false;

    // Handle logStream errors
    logStream.on('error', (err) => {
      console.error(chalk.red(`\n⚠️  Log write error: ${err.message}`));
      hasError = true;
    });

    // Handle stdout
    child.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();

      // Write to console with colors preserved (no redaction for user's view)
      process.stdout.write(output);

      // Write to log file: strip ANSI codes AND redact secrets
      if (!hasError) {
        const cleanOutput = stripAnsi(output);
        const redactedOutput = redactSecrets(cleanOutput);
        logStream.write(redactedOutput);
      }
    });

    // Handle stderr
    child.stderr?.on('data', (data: Buffer) => {
      const output = data.toString();

      // Write to console with colors preserved (no redaction for user's view)
      process.stderr.write(output);

      // Write to log file: strip ANSI codes AND redact secrets
      if (!hasError) {
        const cleanOutput = stripAnsi(output);
        const redactedOutput = redactSecrets(cleanOutput);
        logStream.write(redactedOutput);
      }
    });

    // Handle process exit
    child.on('error', (error) => {
      if (!streamClosed) {
        streamClosed = true;
        logStream.write(`\nProcess error: ${error.message}\n`);
        logStream.end(() => {
          // AI_KEEP_LOGS controls log retention (in days)
          // 0 = delete immediately, don't archive
          // 1+ = archive to inactive directory for X days
          const keepDays = parseInt(process.env.AI_KEEP_LOGS || '1', 10);
          const archiveLog = keepDays > 0;
          markSessionCompleted(sessionId, archiveLog);
          reject(error);
        });
      }
    });

    child.on('close', (code) => {
      if (!streamClosed) {
        streamClosed = true;
        const footer = `\n[${new Date().toISOString()}] Process exited with code: ${code}\n`;
        logStream.write(footer);

        // Wait for stream to finish before continuing
        logStream.end(() => {
          // AI_KEEP_LOGS controls log retention (in days)
          // 0 = delete immediately, don't archive
          // 1+ = archive to inactive directory for X days
          const keepDays = parseInt(process.env.AI_KEEP_LOGS || '1', 10);
          const archiveLog = keepDays > 0;
          markSessionCompleted(sessionId, archiveLog);

          if (code === 0) {
            console.log(chalk.green(`\n✅ Command completed successfully`));
            resolve();
          } else {
            console.log(chalk.yellow(`\n⚠️  Command exited with code ${code}`));
            // Exit with the same code to preserve exit status (synchronous, no resolve needed)
            process.exit(code ?? 1);
          }
        });
      }
    });
  });
}
