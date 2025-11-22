import { randomBytes } from 'crypto';
import { writeFileSync, readFileSync, existsSync } from 'fs';
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
 */
export function registerSession(sessionId: string, command: string, args: string[]): void {
  const timestamp = new Date().toISOString();
  const fullCommand = `${command} ${args.join(' ')}`;
  const entry = `[${timestamp}] [${sessionId}] ${fullCommand}\n`;

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
