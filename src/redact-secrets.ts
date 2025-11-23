/**
 * Secret Redaction Utility
 * Filters sensitive information from command output before logging
 */

// Type for replacement functions
type ReplacementFunction = (match: string, ...args: any[]) => string;

// Common secret patterns to redact
const SECRET_PATTERNS: Array<{ pattern: RegExp; replacement: string | ReplacementFunction }> = [
  // API Keys and tokens (generic)
  {
    pattern: /\b([a-zA-Z0-9_-]*(?:api[_-]?key|token|secret|password|passwd|pwd)[a-zA-Z0-9_-]*)\s*[=:]\s*['"]?([a-zA-Z0-9_\-./+=]{16,})['"]?/gi,
    replacement: (_match: string, key: string) => `${key}=[REDACTED]`
  },

  // AWS Keys
  {
    pattern: /AKIA[0-9A-Z]{16}/g,
    replacement: () => 'AKIA[REDACTED]'
  },
  {
    pattern: /aws_secret_access_key\s*=\s*[^\s]+/gi,
    replacement: () => 'aws_secret_access_key=[REDACTED]'
  },

  // GitHub tokens
  {
    pattern: /gh[ps]_[a-zA-Z0-9]{36,}/g,
    replacement: () => 'ghp_[REDACTED]'
  },

  // Stripe keys
  {
    pattern: /sk_live_[a-zA-Z0-9]{24,}/g,
    replacement: () => 'sk_live_[REDACTED]'
  },
  {
    pattern: /pk_live_[a-zA-Z0-9]{24,}/g,
    replacement: () => 'pk_live_[REDACTED]'
  },

  // OpenAI API keys
  {
    pattern: /sk-[a-zA-Z0-9]{48}/g,
    replacement: () => 'sk-[REDACTED]'
  },

  // Anthropic API keys
  {
    pattern: /sk-ant-[a-zA-Z0-9\-]{95,}/g,
    replacement: () => 'sk-ant-[REDACTED]'
  },

  // Generic Bearer tokens
  {
    pattern: /Bearer\s+[a-zA-Z0-9_\-\.=]+/gi,
    replacement: () => 'Bearer [REDACTED]'
  },

  // JWT tokens (rough pattern)
  {
    pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g,
    replacement: () => 'eyJ[REDACTED_JWT]'
  },

  // Database connection strings
  // Handles passwords with special characters including @ symbols
  // Pattern: protocol://username:password@host
  {
    pattern: /(mongodb|postgres|mysql|redis):\/\/([^:]+):([^@]+)@/gi,
    replacement: (_match: string, protocol: string) => `${protocol}://[USER]:[REDACTED]@`
  },

  // Generic passwords in URLs (any protocol)
  // Handles basic auth with usernames and passwords
  {
    pattern: /:\/\/([^:@\s]+):([^@\s]+)@/g,
    replacement: () => '://[USER]:[REDACTED]@'
  },

  // Private keys (PEM format)
  {
    pattern: /-----BEGIN\s+(?:RSA\s+)?PRIVATE\s+KEY-----[\s\S]*?-----END\s+(?:RSA\s+)?PRIVATE\s+KEY-----/gi,
    replacement: () => '-----BEGIN PRIVATE KEY-----\n[REDACTED]\n-----END PRIVATE KEY-----'
  },

  // SSH private keys
  {
    pattern: /-----BEGIN\s+OPENSSH\s+PRIVATE\s+KEY-----[\s\S]*?-----END\s+OPENSSH\s+PRIVATE\s+KEY-----/gi,
    replacement: () => '-----BEGIN OPENSSH PRIVATE KEY-----\n[REDACTED]\n-----END OPENSSH PRIVATE KEY-----'
  },

  // Environment variable exports with sensitive values
  {
    pattern: /export\s+([A-Z_]*(?:KEY|TOKEN|SECRET|PASSWORD|PASSWD)[A-Z_]*)\s*=\s*['"]?([^\s'"]{8,})['"]?/gi,
    replacement: (_match: string, varName: string) => `export ${varName}=[REDACTED]`
  },

  // Credit card numbers (basic pattern)
  {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
    replacement: () => 'XXXX-XXXX-XXXX-[REDACTED]'
  },

  // Browser-specific patterns

  // Session cookies and auth tokens in Cookie header
  {
    pattern: /Cookie:\s*([^;]+;?\s*)*/gi,
    replacement: () => 'Cookie: [REDACTED]'
  },

  // Set-Cookie headers
  {
    pattern: /Set-Cookie:\s*[^\n]+/gi,
    replacement: () => 'Set-Cookie: [REDACTED]'
  },

  // Authorization header values
  {
    pattern: /Authorization:\s*([^\n]+)/gi,
    replacement: () => 'Authorization: [REDACTED]'
  },

  // X-API-Key and similar headers
  {
    pattern: /X-API-Key:\s*([^\n]+)/gi,
    replacement: () => 'X-API-Key: [REDACTED]'
  },

  // localStorage/sessionStorage values in browser logs
  {
    pattern: /(localStorage|sessionStorage)\[['"]([^'"]*(?:token|key|secret|password|auth)[^'"]*)['"]\]\s*=\s*['"]([^'"]+)['"]/gi,
    replacement: (_match: string, storage: string, key: string) => `${storage}['${key}'] = '[REDACTED]'`
  },

  // Cookie values in JavaScript (document.cookie assignments)
  {
    pattern: /document\.cookie\s*=\s*['"]([^'"]+)['"]/gi,
    replacement: () => `document.cookie = '[REDACTED]'`
  },

  // JSON Web Tokens in localStorage/cookies (more specific than generic JWT pattern)
  {
    pattern: /(['"])(eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\1/g,
    replacement: (_match: string, quote: string) => `${quote}eyJ[REDACTED_JWT]${quote}`
  },

  // Access tokens in JSON responses
  {
    pattern: /['"]access_token['"]\s*:\s*['"]([^'"]+)['"]/gi,
    replacement: () => `"access_token": "[REDACTED]"`
  },

  // Refresh tokens in JSON responses
  {
    pattern: /['"]refresh_token['"]\s*:\s*['"]([^'"]+)['"]/gi,
    replacement: () => `"refresh_token": "[REDACTED]"`
  },

  // CSRF tokens
  {
    pattern: /['"]csrf_token['"]\s*:\s*['"]([^'"]+)['"]/gi,
    replacement: () => `"csrf_token": "[REDACTED]"`
  },

  // Session IDs in URLs or cookies
  {
    pattern: /PHPSESSID=([a-zA-Z0-9]+)/gi,
    replacement: () => 'PHPSESSID=[REDACTED]'
  },
  {
    pattern: /JSESSIONID=([a-zA-Z0-9]+)/gi,
    replacement: () => 'JSESSIONID=[REDACTED]'
  },
];

/**
 * Redacts secrets from text
 * @param text The text to redact
 * @returns Text with secrets replaced with [REDACTED]
 */
export function redactSecrets(text: string): string {
  let redacted = text;

  for (const { pattern, replacement } of SECRET_PATTERNS) {
    if (typeof replacement === 'string') {
      redacted = redacted.replace(pattern, replacement);
    } else {
      redacted = redacted.replace(pattern, replacement);
    }
  }

  return redacted;
}

/**
 * Check if text contains potential secrets (for warning purposes)
 * @param text The text to check
 * @returns True if potential secrets are detected
 */
export function containsSecrets(text: string): boolean {
  return SECRET_PATTERNS.some(({ pattern }) => {
    // Clone the regex to avoid state pollution
    // Global regexes maintain lastIndex state which can cause bugs
    const regex = new RegExp(pattern.source, pattern.flags);
    return regex.test(text);
  });
}
