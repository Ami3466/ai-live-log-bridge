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
 * Check if a process with the given PID is still alive.
 * Uses `kill(pid, 0)` which doesn't send a signal — just probes existence.
 * EPERM means the process exists but we don't own it (treat as alive).
 * ESRCH (or any other error) means it's gone.
 */
export function isProcessAlive(pid: number | undefined | null): boolean {
  if (!pid || typeof pid !== 'number' || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    return code === 'EPERM';
  }
}

type ActiveSessionEntry = {
  projectDir: string;
  startTime: string;
  pid?: number;
};

/**
 * Mark a session as active (running)
 * @param sessionId The session ID
 * @param projectDir The project directory
 * @param pid The PID of the process owning this session (defaults to current process)
 */
export function markSessionActive(sessionId: string, projectDir: string, pid: number = process.pid): void {
  const activePath = getActiveSessionsPath();
  let active: Record<string, ActiveSessionEntry> = {};

  if (existsSync(activePath)) {
    const content = readFileSync(activePath, 'utf-8');
    try {
      active = JSON.parse(content);
    } catch {
      active = {};
    }
  }

  active[sessionId] = {
    projectDir,
    startTime: new Date().toISOString(),
    pid
  };

  writeFileSync(activePath, JSON.stringify(active, null, 2), 'utf-8');
}

/**
 * Reap sessions whose owning process is no longer alive.
 * Legacy entries without a PID are also reaped (they predate PID tracking).
 * Safe to call on every read — it's cheap (a kill(pid, 0) per entry) and only
 * writes when something actually died.
 * @returns Number of sessions reaped
 */
export function reapDeadSessions(): number {
  const activePath = getActiveSessionsPath();
  if (!existsSync(activePath)) {
    return 0;
  }

  let active: Record<string, ActiveSessionEntry>;
  try {
    active = JSON.parse(readFileSync(activePath, 'utf-8'));
  } catch {
    return 0;
  }

  const dead: string[] = [];
  for (const [id, data] of Object.entries(active)) {
    if (!isProcessAlive(data.pid)) {
      dead.push(id);
    }
  }

  for (const id of dead) {
    markSessionCompleted(id, true);
  }
  return dead.length;
}

/**
 * End ALL currently-active sessions unconditionally (dead or alive) and
 * archive their logs. Called at wrapper startup so there is only ever one
 * active session at a time — the fresh one about to register. This is the
 * simplest possible invariant that makes "stale zombie sessions" impossible
 * by construction: the state file never holds more than one entry.
 * @returns Number of sessions ended
 */
export function endAllActiveSessions(): number {
  const activePath = getActiveSessionsPath();
  if (!existsSync(activePath)) return 0;

  let active: Record<string, ActiveSessionEntry>;
  try {
    active = JSON.parse(readFileSync(activePath, 'utf-8'));
  } catch {
    return 0;
  }

  const ids = Object.keys(active);
  for (const id of ids) {
    markSessionCompleted(id, true);
  }
  return ids.length;
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
  // Always reap dead sessions first so callers never see zombies.
  reapDeadSessions();

  const activePath = getActiveSessionsPath();

  if (!existsSync(activePath)) {
    return [];
  }

  let active: Record<string, ActiveSessionEntry>;
  try {
    active = JSON.parse(readFileSync(activePath, 'utf-8'));
  } catch {
    return [];
  }

  if (projectDir) {
    return Object.keys(active).filter(id => active[id].projectDir === projectDir);
  }

  return Object.keys(active);
}

/**
 * Clean up stale sessions. Reaps by PID (dead process → dead session), which
 * is the authoritative signal — a long-running `npm start` idle overnight is
 * still alive and shouldn't be reaped.
 * The `maxAgeMinutes` param is kept for backwards compatibility but unused;
 * PID liveness replaces the age heuristic.
 * @returns Number of stale sessions cleaned up
 */
export function cleanupStaleSessions(_maxAgeMinutes: number = 60): number {
  return reapDeadSessions();
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
