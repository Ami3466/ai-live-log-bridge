import { join } from 'path';
import { homedir } from 'os';
import { mkdirSync, existsSync, readdirSync, statSync, readFileSync } from 'fs';

/**
 * Shared storage configuration for all modes
 */
export const MCP_DIR = join(homedir(), '.mcp-logs');
export const LOG_FILE = join(MCP_DIR, 'session.log'); // Legacy single file (for backwards compatibility)

/**
 * Ensure the storage directory exists
 */
export function ensureStorageExists(): void {
  if (!existsSync(MCP_DIR)) {
    mkdirSync(MCP_DIR, { recursive: true });
  }
}

/**
 * Get all session log files sorted by modification time (most recent first)
 * @param limit Optional limit on number of files to return
 * @returns Array of full file paths
 */
export function getSessionLogFiles(limit?: number): string[] {
  ensureStorageExists();

  if (!existsSync(MCP_DIR)) {
    return [];
  }

  const files = readdirSync(MCP_DIR)
    .filter(file => file.startsWith('session-') && file.endsWith('.log'))
    .map(file => ({
      path: join(MCP_DIR, file),
      mtime: statSync(join(MCP_DIR, file)).mtime.getTime()
    }))
    .sort((a, b) => b.mtime - a.mtime) // Most recent first
    .map(f => f.path);

  return limit ? files.slice(0, limit) : files;
}

/**
 * Read last N lines from multiple session files
 * @param totalLines Total number of lines to read across all files
 * @param maxFiles Maximum number of session files to read
 * @returns Combined log content
 */
export function readRecentLogs(totalLines: number, maxFiles: number = 10): string {
  const sessionFiles = getSessionLogFiles(maxFiles);

  if (sessionFiles.length === 0) {
    // Fallback to legacy session.log if it exists
    if (existsSync(LOG_FILE)) {
      const content = readFileSync(LOG_FILE, 'utf-8');
      const lines = content.split('\n');
      return lines.slice(-totalLines).join('\n');
    }
    return '';
  }

  // Read from most recent sessions
  const allLines: string[] = [];

  for (const file of sessionFiles) {
    if (allLines.length >= totalLines) break;

    const content = readFileSync(file, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim().length > 0);

    // Add session separator for clarity
    const fileName = file.split('/').pop() || '';
    allLines.push(`\n━━━ ${fileName} ━━━`);
    allLines.push(...lines);
  }

  // Return last N lines across all files
  return allLines.slice(-totalLines).join('\n');
}
