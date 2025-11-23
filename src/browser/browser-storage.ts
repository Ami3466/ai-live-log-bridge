import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync, readdirSync, statSync, readFileSync } from 'fs';
import { getBrowserMasterIndexPath, getActiveBrowserSessions } from './browser-session.js';

/**
 * Storage configuration for browser monitoring
 * Mirrors the pattern from src/storage.ts but for browser logs
 */
export const BROWSER_MCP_DIR = join(homedir(), '.mcp-logs', 'browser');
export const BROWSER_ACTIVE_DIR = join(BROWSER_MCP_DIR, 'active');
export const BROWSER_INACTIVE_DIR = join(BROWSER_MCP_DIR, 'inactive');

/**
 * Ensure the browser storage directory exists
 */
export function ensureBrowserStorageExists(): void {
  if (!existsSync(BROWSER_MCP_DIR)) {
    mkdirSync(BROWSER_MCP_DIR, { recursive: true });
  }
  if (!existsSync(BROWSER_ACTIVE_DIR)) {
    mkdirSync(BROWSER_ACTIVE_DIR, { recursive: true });
  }
  if (!existsSync(BROWSER_INACTIVE_DIR)) {
    mkdirSync(BROWSER_INACTIVE_DIR, { recursive: true });
  }
}

/**
 * Get browser session IDs for a specific project directory (LIVE SESSIONS ONLY)
 * @param projectDir The project directory to filter by
 * @param liveOnly If true, only return currently active sessions (default: true)
 * @returns Array of session IDs for this project (most recent first)
 */
export function getBrowserSessionIdsForProject(projectDir: string, liveOnly: boolean = true): string[] {
  // If liveOnly is true, get only active sessions
  if (liveOnly) {
    const activeSessions = getActiveBrowserSessions(projectDir);
    return activeSessions.reverse(); // Most recent first
  }

  // Otherwise, get all sessions from master index (historical)
  const masterPath = getBrowserMasterIndexPath();

  if (!existsSync(masterPath)) {
    return [];
  }

  const content = readFileSync(masterPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  const sessionIds: string[] = [];
  // Pattern: [timestamp] [sessionId] [cwd] [URL: url] (optional URL)
  const pattern = /\[([^\]]+)\]\s+\[(browser-[^\]]+)\]\s+\[([^\]]+)\]/;

  for (const line of lines) {
    const match = line.match(pattern);
    if (match) {
      const [, , sessionId, cwd] = match;
      // Only include sessions that match the current project directory
      if (cwd === projectDir) {
        sessionIds.push(sessionId);
      }
    }
  }

  return sessionIds.reverse(); // Most recent first
}

/**
 * Get all browser session log files sorted by modification time (most recent first)
 * @param limit Optional limit on number of files to return
 * @param projectDir Optional project directory to filter by
 * @param liveOnly If true, only return active sessions (default: true)
 * @returns Array of full file paths
 */
export function getBrowserSessionLogFiles(limit?: number, projectDir?: string, liveOnly: boolean = true): string[] {
  ensureBrowserStorageExists();

  // Determine which directory to read from
  const searchDir = liveOnly ? BROWSER_ACTIVE_DIR : BROWSER_INACTIVE_DIR;

  if (!existsSync(searchDir)) {
    return [];
  }

  // If projectDir is specified, only get sessions for that project
  if (projectDir) {
    const sessionIds = getBrowserSessionIdsForProject(projectDir, liveOnly);
    const files = sessionIds
      .map(id => ({
        path: join(searchDir, `${id}.log`),
        mtime: existsSync(join(searchDir, `${id}.log`))
          ? statSync(join(searchDir, `${id}.log`)).mtime.getTime()
          : 0
      }))
      .filter(f => f.mtime > 0)
      .sort((a, b) => b.mtime - a.mtime) // Most recent first
      .map(f => f.path);

    return limit ? files.slice(0, limit) : files;
  }

  // Otherwise, get all active sessions (if liveOnly is true)
  if (liveOnly) {
    const activeSessionIds = getActiveBrowserSessions();
    const files = activeSessionIds
      .map(id => ({
        path: join(searchDir, `${id}.log`),
        mtime: existsSync(join(searchDir, `${id}.log`))
          ? statSync(join(searchDir, `${id}.log`)).mtime.getTime()
          : 0
      }))
      .filter(f => f.mtime > 0)
      .sort((a, b) => b.mtime - a.mtime) // Most recent first
      .map(f => f.path);

    return limit ? files.slice(0, limit) : files;
  }

  // Otherwise, get all session files from the appropriate directory
  const files = readdirSync(searchDir)
    .filter(file => file.startsWith('browser-') && file.endsWith('.log'))
    .map(file => ({
      path: join(searchDir, file),
      mtime: statSync(join(searchDir, file)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime) // Most recent first
    .map(f => f.path);

  return limit ? files.slice(0, limit) : files;
}

/**
 * Get the most recently used project directory from the browser master index
 * @returns The project directory of the most recent browser session, or null if none found
 */
export function getMostRecentBrowserProjectDir(): string | null {
  const masterPath = getBrowserMasterIndexPath();

  if (!existsSync(masterPath)) {
    return null;
  }

  const content = readFileSync(masterPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  // Pattern: [timestamp] [sessionId] [cwd]
  const pattern = /\[([^\]]+)\]\s+\[([^\]]+)\]\s+\[([^\]]+)\]/;

  // Search from end (most recent) to beginning
  for (let i = lines.length - 1; i >= 0; i--) {
    const match = lines[i].match(pattern);
    if (match) {
      const [, , , cwd] = match;
      return cwd;
    }
  }

  return null;
}

/**
 * Read last N lines from multiple browser session files (LIVE SESSIONS ONLY)
 * @param totalLines Total number of lines to read across all files
 * @param maxFiles Maximum number of session files to read
 * @param projectDir Optional project directory to filter by (defaults to most recent project)
 * @param liveOnly If true, only read from active sessions (default: true)
 * @returns Combined log content, prioritizing most recent sessions
 */
export function readRecentBrowserLogs(totalLines: number, maxFiles: number = 10, projectDir?: string, liveOnly: boolean = true): string {
  // Default to the most recently used project directory or current directory
  const filterDir = projectDir || getMostRecentBrowserProjectDir() || process.cwd();

  const sessionFiles = getBrowserSessionLogFiles(maxFiles, filterDir, liveOnly);

  if (sessionFiles.length === 0) {
    return `No browser logs found for project: ${filterDir}\n\nRun browser monitoring first by installing the Chrome extension.`;
  }

  // Read from most recent sessions, newest first
  const allLines: string[] = [];
  let remainingLines = totalLines;

  for (const file of sessionFiles) {
    if (remainingLines <= 0) break;

    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    // Add simple session separator
    const fileName = file.split('/').pop() || '';
    const separator = `\n[Session: ${fileName.replace('.log', '')}]\n`;

    // For the most recent file, show all available lines up to the limit
    // For older files, show only what we need to reach totalLines
    const linesToTake = Math.min(lines.length, remainingLines);
    const selectedLines = lines.slice(-linesToTake); // Take from end of file (most recent)

    // Prepend to maintain chronological order (newest first)
    allLines.unshift(...selectedLines);
    allLines.unshift(separator);

    remainingLines -= linesToTake;
  }

  return allLines.join('\n');
}
