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
      const EXPECTED_EXTENSION_ID = 'ljdggojoihiofgflmpjffflhfjejndjg';
      if (manifest.allowed_origins && Array.isArray(manifest.allowed_origins)) {
        const expectedOrigin = `chrome-extension://${EXPECTED_EXTENSION_ID}/`;
        if (manifest.allowed_origins[0] === expectedOrigin) {
          success('Extension ID is configured correctly (Chrome Web Store)');
          info(`Allowed origin: ${manifest.allowed_origins[0]}`);
        } else if (manifest.allowed_origins[0] === 'chrome-extension://YOUR_EXTENSION_ID/') {
          warning('Extension ID not configured. Run: npm run install-native-host');
          hasWarnings = true;
        } else {
          // Custom extension ID - validate format
          const match = manifest.allowed_origins[0].match(/chrome-extension:\/\/([a-p]{32})\//);
          if (match) {
            warning(`Custom extension ID configured: ${match[1]}`);
            info('Expected Chrome Web Store ID: ' + EXPECTED_EXTENSION_ID);
            hasWarnings = true;
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

// Check 3: Chrome extension
console.log('\n3. Checking Chrome extension...');
info('Install the extension from Chrome Web Store:');
info('https://chromewebstore.google.com/detail/ai-live-terminal-bridge-b/ljdggojoihiofgflmpjffflhfjejndjg');
info('(Cannot verify Chrome Web Store extension installation from script)');

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
  console.log('  1. Install the extension from Chrome Web Store:');
  console.log('     https://chromewebstore.google.com/detail/ai-live-terminal-bridge-b/ljdggojoihiofgflmpjffflhfjejndjg');
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
