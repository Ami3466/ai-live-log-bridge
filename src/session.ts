import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { MCP_DIR } from './storage.js';

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
 */
export function getSessionLogPath(sessionId: string): string {
  return join(MCP_DIR, `session-${sessionId}.log`);
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

  // Extract session IDs using regex
  const sessionIds: string[] = [];
  const sessionIdPattern = /\[([\d-]+)\]/;

  for (const line of lines) {
    const match = line.match(sessionIdPattern);
    if (match) {
      sessionIds.push(match[1]);
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
 * Mark a session as completed and optionally delete its log
 * @param sessionId The session ID
 * @param deleteLog Whether to delete the log file (default: true)
 */
export function markSessionCompleted(sessionId: string, deleteLog: boolean = true): void {
  const activePath = getActiveSessionsPath();

  if (existsSync(activePath)) {
    const content = readFileSync(activePath, 'utf-8');
    const active = JSON.parse(content);
    delete active[sessionId];
    writeFileSync(activePath, JSON.stringify(active, null, 2), 'utf-8');
  }

  // Delete the log file if requested
  if (deleteLog) {
    const logPath = getSessionLogPath(sessionId);
    if (existsSync(logPath)) {
      unlinkSync(logPath);
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
