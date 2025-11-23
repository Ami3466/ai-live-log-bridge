import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync, existsSync, unlinkSync, renameSync, mkdirSync, statSync } from 'fs';
import { join } from 'path';
import { BROWSER_MCP_DIR, BROWSER_ACTIVE_DIR, BROWSER_INACTIVE_DIR } from './browser-storage.js';

/**
 * Simple file-based locking mechanism to prevent concurrent writes
 * Uses lock files to ensure atomic operations on shared JSON files
 */
const activeLocks = new Set<string>();

/**
 * Sleep for a specified number of milliseconds (non-blocking)
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function acquireLock(lockName: string, timeoutMs: number = 5000): Promise<boolean> {
  const lockFile = join(BROWSER_MCP_DIR, `.${lockName}.lock`);
  const startTime = Date.now();

  // Ensure directory exists
  if (!existsSync(BROWSER_MCP_DIR)) {
    mkdirSync(BROWSER_MCP_DIR, { recursive: true });
  }

  // Wait for lock to be available (with non-blocking sleep)
  while (activeLocks.has(lockName) || existsSync(lockFile)) {
    if (Date.now() - startTime > timeoutMs) {
      // Lock timeout - clean up stale lock if it's too old
      try {
        if (existsSync(lockFile)) {
          const stats = statSync(lockFile);
          const fileAge = Date.now() - stats.mtimeMs;
          if (fileAge > 30000) { // 30 seconds
            unlinkSync(lockFile);
            console.error(`[Browser Session] Cleaned up stale lock: ${lockName}`);
          }
        }
      } catch (err) {
        console.error(`[Browser Session] Failed to clean up stale lock: ${err instanceof Error ? err.message : String(err)}`);
      }
      return false;
    }
    // Non-blocking sleep instead of busy-wait
    await sleep(10);
  }

  // Acquire lock
  activeLocks.add(lockName);
  try {
    writeFileSync(lockFile, String(process.pid), 'utf-8');
    return true;
  } catch (err) {
    activeLocks.delete(lockName);
    console.error(`[Browser Session] Failed to acquire lock ${lockName}: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

function releaseLock(lockName: string): void {
  const lockFile = join(BROWSER_MCP_DIR, `.${lockName}.lock`);
  activeLocks.delete(lockName);
  try {
    if (existsSync(lockFile)) {
      unlinkSync(lockFile);
    }
  } catch (err) {
    console.error(`[Browser Session] Failed to release lock ${lockName}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Browser Session Management
 * Manages unique session IDs for each browser monitoring session
 * Mirrors the pattern from src/session.ts but for browser connections
 */

/**
 * Generate a short, readable browser session ID
 * Format: browser-<timestamp>-<random-hex>
 * Example: browser-20250122143022-a3f2
 */
export function generateBrowserSessionId(): string {
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14); // YYYYMMDDHHmmss
  const random = randomBytes(2).toString('hex'); // 4 chars
  return `browser-${timestamp}-${random}`;
}

/**
 * Get the browser session log file path for a given session ID
 * @param sessionId The browser session ID
 * @param active If true, return path in active directory, otherwise inactive (default: true)
 */
export function getBrowserSessionLogPath(sessionId: string, active: boolean = true): string {
  const dir = active ? BROWSER_ACTIVE_DIR : BROWSER_INACTIVE_DIR;
  return join(dir, `${sessionId}.log`);
}

/**
 * Get the browser master index file path
 * This file tracks all browser session IDs in chronological order
 */
export function getBrowserMasterIndexPath(): string {
  return join(BROWSER_MCP_DIR, 'master-browser-index.log');
}

/**
 * Register a new browser session in the master index
 * @param sessionId The browser session ID to register
 * @param projectDir The working directory where the browser monitoring was started
 * @param url The URL being monitored (optional)
 */
export async function registerBrowserSession(sessionId: string, projectDir: string, url?: string): Promise<void> {
  const timestamp = new Date().toISOString();
  const urlPart = url ? ` [URL: ${url}]` : '';
  const entry = `[${timestamp}] [${sessionId}] [${projectDir}]${urlPart}\n`;

  const masterPath = getBrowserMasterIndexPath();

  // Acquire lock before modifying shared file
  if (!(await acquireLock('master-index', 5000))) {
    console.error('[Browser Session] Failed to acquire lock for master index');
    return;
  }

  try {
    // Append to master index (create if doesn't exist)
    if (existsSync(masterPath)) {
      const content = readFileSync(masterPath, 'utf-8');
      writeFileSync(masterPath, content + entry, 'utf-8');
    } else {
      writeFileSync(masterPath, entry, 'utf-8');
    }
  } finally {
    releaseLock('master-index');
  }
}

/**
 * Get all browser session IDs from the master index
 * @returns Array of session IDs in chronological order
 */
export function getAllBrowserSessionIds(): string[] {
  const masterPath = getBrowserMasterIndexPath();

  if (!existsSync(masterPath)) {
    return [];
  }

  const content = readFileSync(masterPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  // Extract session IDs using regex
  const sessionIds: string[] = [];
  const sessionIdPattern = /\[(browser-[\d-]+)\]/;

  for (const line of lines) {
    const match = line.match(sessionIdPattern);
    if (match) {
      sessionIds.push(match[1]);
    }
  }

  return sessionIds;
}

/**
 * Get the active browser sessions file path
 * This file tracks currently running browser sessions
 */
export function getActiveBrowserSessionsPath(): string {
  return join(BROWSER_MCP_DIR, 'active-browser-sessions.json');
}

/**
 * Mark a browser session as active (running)
 * @param sessionId The browser session ID
 * @param projectDir The project directory
 * @param url The URL being monitored (optional)
 */
export async function markBrowserSessionActive(sessionId: string, projectDir: string, url?: string): Promise<void> {
  const activePath = getActiveBrowserSessionsPath();

  // Acquire lock before modifying shared file
  if (!(await acquireLock('active-sessions', 5000))) {
    console.error('[Browser Session] Failed to acquire lock for active sessions');
    return;
  }

  try {
    let active: Record<string, { projectDir: string; startTime: string; url?: string }> = {};

    if (existsSync(activePath)) {
      const content = readFileSync(activePath, 'utf-8');
      active = JSON.parse(content);
    }

    active[sessionId] = {
      projectDir,
      startTime: new Date().toISOString(),
      ...(url && { url })
    };

    writeFileSync(activePath, JSON.stringify(active, null, 2), 'utf-8');
  } finally {
    releaseLock('active-sessions');
  }
}

/**
 * Mark a browser session as completed and move its log to inactive directory
 * @param sessionId The browser session ID
 * @param archiveLog Whether to archive the log file to inactive directory (default: true)
 */
export async function markBrowserSessionCompleted(sessionId: string, archiveLog: boolean = true): Promise<void> {
  const activePath = getActiveBrowserSessionsPath();

  // Acquire lock before modifying shared file
  if (!(await acquireLock('active-sessions', 5000))) {
    console.error('[Browser Session] Failed to acquire lock for active sessions');
    return;
  }

  try {
    if (existsSync(activePath)) {
      const content = readFileSync(activePath, 'utf-8');
      const active = JSON.parse(content);
      delete active[sessionId];
      writeFileSync(activePath, JSON.stringify(active, null, 2), 'utf-8');
    }
  } finally {
    releaseLock('active-sessions');
  }

  // Move the log file to inactive directory if requested
  // (file operations don't need locks as they're session-specific)
  if (archiveLog) {
    const activeLogPath = getBrowserSessionLogPath(sessionId, true);
    const inactiveLogPath = getBrowserSessionLogPath(sessionId, false);

    if (existsSync(activeLogPath)) {
      try {
        renameSync(activeLogPath, inactiveLogPath);
      } catch (err) {
        console.error(`[Browser Session] Failed to archive log: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  } else {
    // Delete if not archiving
    const activeLogPath = getBrowserSessionLogPath(sessionId, true);
    if (existsSync(activeLogPath)) {
      try {
        unlinkSync(activeLogPath);
      } catch (err) {
        console.error(`[Browser Session] Failed to delete log: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }
}

/**
 * Get all active browser session IDs for a specific project
 * @param projectDir The project directory (optional - returns all if not specified)
 * @returns Array of active browser session IDs
 */
export function getActiveBrowserSessions(projectDir?: string): string[] {
  const activePath = getActiveBrowserSessionsPath();

  if (!existsSync(activePath)) {
    return [];
  }

  const content = readFileSync(activePath, 'utf-8');
  const active: Record<string, { projectDir: string; startTime: string; url?: string }> = JSON.parse(content);

  if (projectDir) {
    return Object.keys(active).filter(id => active[id].projectDir === projectDir);
  }

  return Object.keys(active);
}

/**
 * Clean up stale browser sessions (sessions older than maxAgeMinutes)
 * @param maxAgeMinutes Maximum age of active sessions in minutes (default: 60)
 * @returns Number of stale sessions cleaned up
 */
export function cleanupStaleBrowserSessions(maxAgeMinutes: number = 60): number {
  const activePath = getActiveBrowserSessionsPath();

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
    markBrowserSessionCompleted(sessionId, true);
    cleanedCount++;
  }

  return cleanedCount;
}
