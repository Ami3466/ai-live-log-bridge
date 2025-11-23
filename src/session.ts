import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync, existsSync, unlinkSync, renameSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { MCP_DIR, ACTIVE_DIR, INACTIVE_DIR } from './storage.js';

/**
 * Session Management
 * Generates unique session IDs for each command execution
 */

/**
 * Generate a short, readable session ID
 * Format: <timestamp>-<random-hex>
 * Example: 20250122-a3f2
 */
export function generateSessionId(): string {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHmmss
  const random = randomBytes(2).toString('hex'); // 4 chars
  return `${timestamp}-${random}`;
}

/**
 * Get the session log file path for a given session ID
 * @param sessionId The session ID
 * @param active If true, return path in active directory, otherwise inactive (default: true)
 */
export function getSessionLogPath(sessionId: string, active: boolean = true): string {
  const dir = active ? ACTIVE_DIR : INACTIVE_DIR;
  return join(dir, `session-${sessionId}.log`);
}

/**
 * Get the master index file path
 * This file tracks all session IDs in chronological order
 */
export function getMasterIndexPath(): string {
  return join(MCP_DIR, 'master-index.log');
}

/**
 * Register a new session in the master index
 * @param sessionId The session ID to register
 * @param command The command being executed
 * @param args The command arguments
 * @param cwd The working directory where the command was executed
 */
export function registerSession(sessionId: string, command: string, args: string[], cwd: string): void {
  const timestamp = new Date().toISOString();
  const fullCommand = `${command} ${args.join(' ')}`;
  const entry = `[${timestamp}] [${sessionId}] [${cwd}] ${fullCommand}\n`;

  const masterPath = getMasterIndexPath();

  // Append to master index (create if doesn't exist)
  if (existsSync(masterPath)) {
    const content = readFileSync(masterPath, 'utf-8');
    writeFileSync(masterPath, content + entry, 'utf-8');
  } else {
    writeFileSync(masterPath, entry, 'utf-8');
  }
}

/**
 * Validate session ID format
 * @param sessionId The session ID to validate
 * @returns true if valid, false otherwise
 */
function isValidSessionId(sessionId: string): boolean {
  // Session ID format: YYYYMMDDHHmmss-xxxx (timestamp + 4 hex chars)
  // Example: 20250122143022-a3f2
  const validPattern = /^\d{14}-[a-f0-9]{4}$/;

  // Additional length check to prevent extremely long inputs
  if (sessionId.length > 100) {
    return false;
  }

  return validPattern.test(sessionId);
}

/**
 * Get all session IDs from the master index
 * @returns Array of session IDs in chronological order
 */
export function getAllSessionIds(): string[] {
  const masterPath = getMasterIndexPath();

  if (!existsSync(masterPath)) {
    return [];
  }

  const content = readFileSync(masterPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  // Extract session IDs using regex with validation
  const sessionIds: string[] = [];
  const sessionIdPattern = /\[([\d-]+)\]/;

  for (const line of lines) {
    // Skip extremely long lines to prevent DoS
    if (line.length > 10000) {
      console.error('[Session] Skipping malformed line (too long)');
      continue;
    }

    const match = line.match(sessionIdPattern);
    if (match) {
      const sessionId = match[1];
      // Validate session ID format before adding
      if (isValidSessionId(sessionId)) {
        sessionIds.push(sessionId);
      } else {
        console.error(`[Session] Invalid session ID format: ${sessionId}`);
      }
    }
  }

  return sessionIds;
}

/**
 * Get the most recent N session IDs
 * @param count Number of recent sessions to retrieve
 * @returns Array of session IDs (most recent first)
 */
export function getRecentSessionIds(count: number): string[] {
  const allIds = getAllSessionIds();
  return allIds.slice(-count).reverse(); // Most recent first
}

/**
 * Get the active sessions file path
 * This file tracks currently running sessions
 */
export function getActiveSessionsPath(): string {
  return join(MCP_DIR, 'active-sessions.json');
}

/**
 * Mark a session as active (running)
 * @param sessionId The session ID
 * @param projectDir The project directory
 */
export function markSessionActive(sessionId: string, projectDir: string): void {
  const activePath = getActiveSessionsPath();
  let active: Record<string, { projectDir: string; startTime: string }> = {};

  if (existsSync(activePath)) {
    const content = readFileSync(activePath, 'utf-8');
    active = JSON.parse(content);
  }

  active[sessionId] = {
    projectDir,
    startTime: new Date().toISOString()
  };

  writeFileSync(activePath, JSON.stringify(active, null, 2), 'utf-8');
}

/**
 * Mark a session as completed and move its log to inactive directory
 * @param sessionId The session ID
 * @param archiveLog Whether to archive the log file to inactive directory (default: true)
 */
export function markSessionCompleted(sessionId: string, archiveLog: boolean = true): void {
  const activePath = getActiveSessionsPath();

  if (existsSync(activePath)) {
    const content = readFileSync(activePath, 'utf-8');
    const active = JSON.parse(content);
    delete active[sessionId];
    writeFileSync(activePath, JSON.stringify(active, null, 2), 'utf-8');
  }

  // Move the log file to inactive directory if requested
  if (archiveLog) {
    const activeLogPath = getSessionLogPath(sessionId, true);
    const inactiveLogPath = getSessionLogPath(sessionId, false);

    if (existsSync(activeLogPath)) {
      renameSync(activeLogPath, inactiveLogPath);
    }
  } else {
    // Delete if not archiving
    const activeLogPath = getSessionLogPath(sessionId, true);
    if (existsSync(activeLogPath)) {
      unlinkSync(activeLogPath);
    }
  }
}

/**
 * Get all active session IDs for a specific project
 * @param projectDir The project directory (optional - returns all if not specified)
 * @returns Array of active session IDs
 */
export function getActiveSessions(projectDir?: string): string[] {
  const activePath = getActiveSessionsPath();

  if (!existsSync(activePath)) {
    return [];
  }

  const content = readFileSync(activePath, 'utf-8');
  const active: Record<string, { projectDir: string; startTime: string }> = JSON.parse(content);

  if (projectDir) {
    return Object.keys(active).filter(id => active[id].projectDir === projectDir);
  }

  return Object.keys(active);
}

/**
 * Clean up stale sessions (sessions older than maxAgeMinutes)
 * This should be called when the ai wrapper starts to remove zombie sessions
 * from interrupted terminals.
 * @param maxAgeMinutes Maximum age of active sessions in minutes (default: 60)
 * @returns Number of stale sessions cleaned up
 */
export function cleanupStaleSessions(maxAgeMinutes: number = 60): number {
  const activePath = getActiveSessionsPath();

  if (!existsSync(activePath)) {
    return 0;
  }

  const content = readFileSync(activePath, 'utf-8');
  const active: Record<string, { projectDir: string; startTime: string }> = JSON.parse(content);

  const now = new Date().getTime();
  const maxAgeMs = maxAgeMinutes * 60 * 1000;
  let cleanedCount = 0;

  // Find stale sessions
  const staleSessionIds = Object.keys(active).filter(sessionId => {
    const startTime = new Date(active[sessionId].startTime).getTime();
    const age = now - startTime;
    return age > maxAgeMs;
  });

  // Clean up stale sessions
  for (const sessionId of staleSessionIds) {
    markSessionCompleted(sessionId, true);
    cleanedCount++;
  }

  return cleanedCount;
}

/**
 * Clean up old inactive logs (logs older than retentionDays)
 * @param retentionDays Number of days to retain inactive logs (default: 7)
 * @returns Number of old logs deleted
 */
export function cleanupOldInactiveLogs(retentionDays: number = 7): number {
  if (!existsSync(INACTIVE_DIR)) {
    return 0;
  }

  const now = new Date().getTime();
  const maxAgeMs = retentionDays * 24 * 60 * 60 * 1000;
  let deletedCount = 0;

  const files = readdirSync(INACTIVE_DIR)
    .filter(file => file.startsWith('session-') && file.endsWith('.log'));

  for (const file of files) {
    const filePath = join(INACTIVE_DIR, file);
    const stats = statSync(filePath);
    const age = now - stats.mtime.getTime();

    if (age > maxAgeMs) {
      unlinkSync(filePath);
      deletedCount++;
    }
  }

  return deletedCount;
}
