import { createWriteStream, WriteStream } from 'fs';
import { z } from 'zod';
import { redactSecrets } from '../redact-secrets.js';
import { ensureBrowserStorageExists } from './browser-storage.js';
import {
  generateBrowserSessionId,
  getBrowserSessionLogPath,
  registerBrowserSession,
  markBrowserSessionActive,
  markBrowserSessionCompleted,
  cleanupStaleBrowserSessions
} from './browser-session.js';

/**
 * Native Messaging Host
 * Receives JSON messages from the Chrome extension via stdin
 * Writes browser console logs and network activity to session files
 * Mirrors the pattern from wrapper.ts but for browser events
 */

// Zod schema for validating incoming messages
const BrowserMessageSchema = z.object({
  type: z.enum(['console', 'network', 'error', 'performance', 'session-start', 'session-end', 'heartbeat']),
  timestamp: z.number().optional(),
  url: z.string().max(2048).optional(), // Prevent extremely long URLs
  tabId: z.number().optional(),

  // Console message fields
  level: z.enum(['log', 'info', 'warn', 'error', 'debug']).optional(),
  text: z.string().max(50000).optional(), // Limit message size to prevent DoS
  stackTrace: z.any().optional(),

  // Network message fields
  method: z.string().max(10).optional(),
  status: z.number().min(100).max(599).optional(),
  duration: z.number().min(0).optional(),
  headers: z.record(z.string()).optional(),
  requestBody: z.string().max(100000).optional(), // Limit body size
  responseBody: z.string().max(100000).optional(),

  // Performance fields
  metric: z.string().max(100).optional(),
  value: z.number().optional(),

  // Session fields
  projectDir: z.string().max(1024).optional(), // Limit path length
});

type BrowserMessage = z.infer<typeof BrowserMessageSchema>;

export class NativeHost {
  private sessionId: string | null = null;
  private logStream: WriteStream | null = null;
  private isStartingSession: boolean = false;
  private messageQueue: BrowserMessage[] = [];
  private processingQueue: boolean = false;

  // Rate limiting
  private messageCount: number = 0;
  private rateLimitWindowStart: number = Date.now();
  private readonly MAX_MESSAGES_PER_SECOND = 1000;

  /**
   * Start the native messaging host
   * Reads JSON messages from stdin (sent by Chrome extension)
   */
  async start(): Promise<void> {
    // Ensure browser storage directory exists
    ensureBrowserStorageExists();

    // Clean up stale sessions (older than 1 day by default)
    const keepDays = parseInt(process.env.AI_KEEP_LOGS || '1', 10);
    const maxAgeMinutes = keepDays * 24 * 60;
    cleanupStaleBrowserSessions(maxAgeMinutes);

    // Log to stderr (stdout is reserved for native messaging protocol)
    console.error('[Native Host] Browser monitoring started');

    /**
     * PROTOCOL NOTE:
     * Chrome's Native Messaging protocol uses length-prefixed binary messages:
     * - First 4 bytes: uint32 message length (little-endian)
     * - Following bytes: UTF-8 encoded JSON message
     *
     * See: https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging
     */
    let buffer = Buffer.alloc(0);

    process.stdin.on('data', (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, chunk]);

      // Process all complete messages in buffer
      while (buffer.length >= 4) {
        // Read message length (first 4 bytes, little-endian uint32)
        const messageLength = buffer.readUInt32LE(0);

        // Check if we have the complete message
        if (buffer.length < 4 + messageLength) {
          break; // Wait for more data
        }

        // Extract the message
        const messageBytes = buffer.slice(4, 4 + messageLength);
        buffer = buffer.slice(4 + messageLength);

        try {
          const messageStr = messageBytes.toString('utf-8');
          const parsed = JSON.parse(messageStr);

          // Validate message structure with Zod
          const validationResult = BrowserMessageSchema.safeParse(parsed);

          if (!validationResult.success) {
            console.error('[Native Host] Invalid message format:', validationResult.error.flatten());
            continue;
          }

          this.handleMessage(validationResult.data);
        } catch (err) {
          console.error('[Native Host] Failed to parse message:', err);
        }
      }
    });

    process.stdin.on('end', () => {
      this.endSession();
      console.error('[Native Host] Input stream ended');
    });

    // Handle process termination
    process.on('SIGINT', () => this.endSession());
    process.on('SIGTERM', () => this.endSession());
  }

  /**
   * Validate and sanitize URL
   * @param url The URL to validate
   * @returns Validated URL or undefined if invalid
   */
  private validateUrl(url: string | undefined): string | undefined {
    if (!url) {
      return undefined;
    }

    try {
      // Try to parse as URL to validate format
      const parsed = new URL(url);

      // Only allow http/https protocols for security
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        console.error(`[Native Host] Invalid URL protocol: ${parsed.protocol}`);
        return undefined;
      }

      // Return the validated URL (limit to 2048 chars as per schema)
      return url.substring(0, 2048);
    } catch (err) {
      console.error(`[Native Host] Invalid URL format: ${url}`);
      return undefined;
    }
  }

  /**
   * Validate and sanitize project directory path
   * For browser monitoring, we always use the native host's working directory
   * This ensures browser logs are grouped with the project they belong to
   */
  private validateProjectDir(_projectDir: string | undefined): string {
    // For browser sessions, always use the native host's cwd as the project identifier
    // This matches how terminal sessions work and allows proper filtering by MCP
    // The URL is still logged separately for reference
    return process.cwd();
  }

  /**
   * Check and enforce rate limiting
   * @returns true if message should be processed, false if rate limit exceeded
   */
  private checkRateLimit(): boolean {
    const now = Date.now();
    const windowElapsed = now - this.rateLimitWindowStart;

    // Reset counter every second
    if (windowElapsed >= 1000) {
      this.messageCount = 0;
      this.rateLimitWindowStart = now;
    }

    this.messageCount++;

    if (this.messageCount > this.MAX_MESSAGES_PER_SECOND) {
      console.error(`[Native Host] Rate limit exceeded: ${this.messageCount} messages/sec`);
      return false;
    }

    return true;
  }

  /**
   * Process queued messages
   */
  private async processMessageQueue(): Promise<void> {
    if (this.processingQueue) {
      return;
    }

    this.processingQueue = true;

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        await this.handleMessageInternal(message);
      }
    }

    this.processingQueue = false;
  }

  /**
   * Handle a message from the Chrome extension
   */
  private async handleMessage(message: BrowserMessage): Promise<void> {
    // Rate limiting check
    if (!this.checkRateLimit()) {
      return;
    }

    if (message.type === 'session-start') {
      const validatedDir = this.validateProjectDir(message.projectDir);
      const validatedUrl = this.validateUrl(message.url);
      await this.startSession(validatedDir, validatedUrl);
      // Process any queued messages after session starts
      await this.processMessageQueue();
      return;
    }

    if (message.type === 'session-end') {
      await this.endSession();
      return;
    }

    if (message.type === 'heartbeat') {
      // Ignore heartbeat messages - they're just to keep the connection alive
      return;
    }

    // If session is not ready, queue the message
    if (!this.sessionId || !this.logStream) {
      if (this.isStartingSession) {
        // Session is starting, queue this message
        this.messageQueue.push(message);
        return;
      }
      // Auto-start session if not already started
      const validatedDir = this.validateProjectDir(message.projectDir);
      const validatedUrl = this.validateUrl(message.url);
      await this.startSession(validatedDir, validatedUrl);
    }

    // Process the message
    await this.handleMessageInternal(message);
  }

  /**
   * Internal handler for processing a message
   */
  private async handleMessageInternal(message: BrowserMessage): Promise<void> {
    // Route message to appropriate handler
    switch (message.type) {
      case 'console':
        this.logConsole(message);
        break;
      case 'network':
        this.logNetwork(message);
        break;
      case 'error':
        this.logError(message);
        break;
      case 'performance':
        this.logPerformance(message);
        break;
      default:
        console.error('[Native Host] Unknown message type:', message.type);
    }
  }

  /**
   * Start a new browser monitoring session
   */
  private async startSession(projectDir: string, url?: string): Promise<void> {
    if (this.sessionId) {
      console.error('[Native Host] Session already started:', this.sessionId);
      return;
    }

    if (this.isStartingSession) {
      console.error('[Native Host] Session start already in progress');
      return;
    }

    this.isStartingSession = true;

    try {
      this.sessionId = generateBrowserSessionId();
      const logFilePath = getBrowserSessionLogPath(this.sessionId);

      // Register this session in the master index
      await registerBrowserSession(this.sessionId, projectDir, url);

      // Mark this session as active
      await markBrowserSessionActive(this.sessionId, projectDir, url);

      // Create log file stream
      this.logStream = createWriteStream(logFilePath, { flags: 'w' });

      // Handle stream errors to prevent crashes
      this.logStream.on('error', (err) => {
        console.error('[Native Host] Log stream error:', err);
        this.endSession();
      });

      // Write header
      const timestamp = new Date().toISOString();
      const urlPart = url ? `\n[${timestamp}] URL: ${url}` : '';
      const header = `${'='.repeat(80)}\n[${timestamp}] Browser Session: ${this.sessionId}\n[${timestamp}] Project: ${projectDir}${urlPart}\n${'='.repeat(80)}\n`;
      this.logStream.write(header);

      console.error(`[Native Host] Started session: ${this.sessionId}`);
    } catch (err) {
      console.error('[Native Host] Failed to start session:', err);
      this.sessionId = null;
      this.logStream = null;
    } finally {
      this.isStartingSession = false;
    }
  }

  /**
   * End the current browser monitoring session
   */
  private async endSession(): Promise<void> {
    if (!this.sessionId && !this.logStream) {
      return;
    }

    try {
      if (this.logStream) {
        const footer = `\n[${new Date().toISOString()}] Browser session ended\n`;
        this.logStream.write(footer);
        this.logStream.end();
      }

      // Mark session as completed
      if (this.sessionId) {
        const keepDays = parseInt(process.env.AI_KEEP_LOGS || '1', 10);
        const archiveLog = keepDays > 0;
        await markBrowserSessionCompleted(this.sessionId, archiveLog);
        console.error(`[Native Host] Ended session: ${this.sessionId}`);
      }
    } catch (err) {
      console.error('[Native Host] Error ending session:', err);
    } finally {
      this.sessionId = null;
      this.logStream = null;
      this.isStartingSession = false;
      // Clear any queued messages
      this.messageQueue = [];
    }
  }

  /**
   * Log a console message
   */
  private logConsole(message: BrowserMessage): void {
    if (!this.logStream) return;

    const timestamp = message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString();
    const level = message.level || 'log';
    const text = message.text || '';
    const url = message.url || '';

    // Redact secrets from console text
    const redactedText = redactSecrets(text);

    let logEntry = `[${timestamp}] [Console ${level}] ${redactedText}`;

    if (url) {
      logEntry += ` (${url})`;
    }

    if (message.stackTrace) {
      logEntry += `\nStack Trace: ${JSON.stringify(message.stackTrace, null, 2)}`;
    }

    logEntry += '\n';
    this.logStream.write(logEntry);
  }

  /**
   * Log a network request/response
   */
  private logNetwork(message: BrowserMessage): void {
    if (!this.logStream) return;

    const timestamp = message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString();
    const method = message.method || 'GET';
    const url = message.url || '';
    const status = message.status || 0;
    const duration = message.duration ? `${message.duration}ms` : '';

    let logEntry = `[${timestamp}] [Network] ${method} ${url}`;

    if (status) {
      logEntry += ` → ${status}`;
    }

    if (duration) {
      logEntry += ` (${duration})`;
    }

    // Log headers if present (redact sensitive values)
    if (message.headers) {
      const redactedHeaders = redactSecrets(JSON.stringify(message.headers, null, 2));
      logEntry += `\nHeaders: ${redactedHeaders}`;
    }

    // Log request/response bodies if present (redact sensitive values)
    if (message.requestBody) {
      const redactedBody = redactSecrets(message.requestBody);
      logEntry += `\nRequest Body: ${redactedBody}`;
    }

    if (message.responseBody) {
      const redactedBody = redactSecrets(message.responseBody);
      logEntry += `\nResponse Body: ${redactedBody}`;
    }

    logEntry += '\n';
    this.logStream.write(logEntry);
  }

  /**
   * Log a JavaScript error
   */
  private logError(message: BrowserMessage): void {
    if (!this.logStream) return;

    const timestamp = message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString();
    const text = message.text || 'Unknown error';
    const url = message.url || '';

    // Redact any sensitive info from error messages
    const redactedText = redactSecrets(text);

    let logEntry = `[${timestamp}] [Error] ${redactedText}`;

    if (url) {
      logEntry += ` (${url})`;
    }

    if (message.stackTrace) {
      logEntry += `\nStack Trace: ${JSON.stringify(message.stackTrace, null, 2)}`;
    }

    logEntry += '\n';
    this.logStream.write(logEntry);
  }

  /**
   * Log a performance metric
   */
  private logPerformance(message: BrowserMessage): void {
    if (!this.logStream) return;

    const timestamp = message.timestamp ? new Date(message.timestamp).toISOString() : new Date().toISOString();
    const metric = message.metric || 'unknown';
    const value = message.value || 0;

    const logEntry = `[${timestamp}] [Performance] ${metric}: ${value}\n`;
    this.logStream.write(logEntry);
  }

}

/**
 * Start the native host if this file is run directly
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const host = new NativeHost();
  host.start().catch(err => {
    console.error('[Native Host] Fatal error:', err);
    process.exit(1);
  });
}
