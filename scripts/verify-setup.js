#!/usr/bin/env node

/**
 * Browser Monitoring Setup Verification Script
 * Checks all requirements for browser monitoring to work correctly
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HOST_NAME = 'com.ai_live_log_bridge.browser_monitor';
const projectRoot = join(__dirname, '..');

// ANSI color codes for output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
};

function success(msg) {
  console.log(`${colors.green}✅ ${msg}${colors.reset}`);
}

function error(msg) {
  console.log(`${colors.red}❌ ${msg}${colors.reset}`);
}

function warning(msg) {
  console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`);
}

function info(msg) {
  console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`);
}

function section(title) {
  console.log(`\n${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${title}${colors.reset}`);
  console.log(`${colors.bold}${colors.blue}${'='.repeat(60)}${colors.reset}\n`);
}

function getManifestPath() {
  const platform = process.platform;

  if (platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'Google',
      'Chrome',
      'NativeMessagingHosts',
      `${HOST_NAME}.json`
    );
  } else if (platform === 'linux') {
    return join(
      homedir(),
      '.config',
      'google-chrome',
      'NativeMessagingHosts',
      `${HOST_NAME}.json`
    );
  } else {
    return null;
  }
}

let hasErrors = false;
let hasWarnings = false;

section('Browser Monitoring Setup Verification');

// Check 1: TypeScript build
console.log('1. Checking TypeScript build...');
const nativeHostPath = join(projectRoot, 'dist', 'browser', 'native-host');
if (existsSync(nativeHostPath)) {
  success('Native host executable found');
} else {
  error('Native host not built. Run: npm run build');
  hasErrors = true;
}

// Check 2: Native messaging manifest
console.log('\n2. Checking native messaging manifest...');
const manifestPath = getManifestPath();
if (!manifestPath) {
  error('Unsupported platform (Windows not supported yet)');
  hasErrors = true;
} else {
  info(`Expected location: ${manifestPath}`);

  if (existsSync(manifestPath)) {
    success('Manifest file exists');

    // Check manifest contents
    try {
      const manifestContent = readFileSync(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      // Validate manifest structure
      if (manifest.name === HOST_NAME) {
        success('Host name is correct');
      } else {
        error(`Host name mismatch. Expected: ${HOST_NAME}, Got: ${manifest.name}`);
        hasErrors = true;
      }

      if (manifest.path === nativeHostPath) {
        success('Host path is correct');
      } else {
        error(`Host path mismatch.\n  Expected: ${nativeHostPath}\n  Got: ${manifest.path}`);
        hasErrors = true;
      }

      if (manifest.type === 'stdio') {
        success('Communication type is correct (stdio)');
      } else {
        error(`Type should be 'stdio', got: ${manifest.type}`);
        hasErrors = true;
      }

      // Check allowed_origins
      if (manifest.allowed_origins && Array.isArray(manifest.allowed_origins)) {
        if (manifest.allowed_origins[0] === 'chrome-extension://YOUR_EXTENSION_ID/') {
          warning('Extension ID not configured yet. Run: npm run update-extension-id <ID>');
          hasWarnings = true;
        } else {
          success('Extension ID is configured');
          info(`Allowed origin: ${manifest.allowed_origins[0]}`);

          // Validate extension ID format
          const match = manifest.allowed_origins[0].match(/chrome-extension:\/\/([a-p]{32})\//);
          if (match) {
            success('Extension ID format is valid');
          } else {
            error('Extension ID format is invalid (should be 32 lowercase letters a-p)');
            hasErrors = true;
          }
        }
      } else {
        error('allowed_origins is missing or invalid');
        hasErrors = true;
      }
    } catch (err) {
      error(`Failed to parse manifest: ${err.message}`);
      hasErrors = true;
    }
  } else {
    error('Manifest file not found. Run: npm run install-native-host');
    hasErrors = true;
  }
}

// Check 3: Chrome extension directory
console.log('\n3. Checking Chrome extension (optional)...');
// Extension location is user-specific - check common locations
const possibleExtensionPaths = [
  join(homedir(), '.ai-live-log-bridge-extension'),
  join(projectRoot, 'extension'),
  join(homedir(), 'ai-live-log-bridge-extension'),
  join(homedir(), 'Desktop', 'ai-live-log-bridge-extension'),
  join(homedir(), 'Downloads', 'ai-live-log-bridge-extension'),
];

const extensionDir = possibleExtensionPaths.find(p => existsSync(p));

if (extensionDir) {
  success(`Extension directory found at: ${extensionDir}`);

  // Check for manifest.json
  const extManifestPath = join(extensionDir, 'manifest.json');
  if (existsSync(extManifestPath)) {
    success('Extension manifest.json exists');

    try {
      const extManifest = JSON.parse(readFileSync(extManifestPath, 'utf-8'));

      if (extManifest.permissions && extManifest.permissions.includes('nativeMessaging')) {
        success('Extension has nativeMessaging permission');
      } else {
        error('Extension missing nativeMessaging permission');
        hasErrors = true;
      }
    } catch (err) {
      error(`Failed to parse extension manifest: ${err.message}`);
      hasErrors = true;
    }
  } else {
    error('Extension manifest.json not found');
    hasErrors = true;
  }
} else {
  warning('Extension directory not found in common locations');
  info('To download: npm run download-extension');
  info('Or manually download from: https://github.com/Ami3466/ai-live-log-bridge/releases/latest');
  info('The extension can be placed anywhere - this check is optional');
}

// Check 4: Browser logs directory
console.log('\n4. Checking browser logs directory...');
const browserLogsDir = join(homedir(), '.mcp-logs', 'browser');
if (existsSync(browserLogsDir)) {
  success('Browser logs directory exists');
} else {
  info('Browser logs directory will be created on first use');
}

// Summary
section('Summary');

if (!hasErrors && !hasWarnings) {
  console.log(`${colors.green}${colors.bold}🎉 All checks passed!${colors.reset}\n`);
  console.log('Your browser monitoring setup is complete.\n');
  console.log('Next steps:');
  console.log('  1. Load the extension in Chrome (chrome://extensions/)');
  console.log('  2. Open a localhost page');
  console.log('  3. Check logs with: view_browser_logs MCP tool\n');
} else if (hasErrors) {
  console.log(`${colors.red}${colors.bold}❌ Setup has errors that need to be fixed.${colors.reset}\n`);
  console.log('Follow the error messages above to resolve issues.\n');
  process.exit(1);
} else if (hasWarnings) {
  console.log(`${colors.yellow}${colors.bold}⚠️  Setup is mostly complete but has warnings.${colors.reset}\n`);
  console.log('Address the warnings above for full functionality.\n');
}
