#!/usr/bin/env node

/**
 * Native Messaging Host Installation Script
 * Registers the native messaging host with Chrome/Chromium browsers
 * Must be run after building the project
 */

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Native messaging host ID (must match manifest.json in extension)
const HOST_NAME = 'com.ai_live_log_bridge.browser_monitor';

// Get package name from package.json (no hardcoding!)
const projectRoot = join(__dirname, '..');
const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
const PACKAGE_NAME = packageJson.name;

// Get the absolute path to the native host executable
// Try to use global npm installation if available, otherwise use local path
let nativeHostPath;
try {
  // Try to get global npm prefix
  const npmPrefix = execSync('npm root -g', { encoding: 'utf-8' }).trim();
  const globalPath = join(npmPrefix, PACKAGE_NAME, 'dist', 'browser', 'native-host');

  // Check if global installation exists
  if (existsSync(globalPath)) {
    nativeHostPath = globalPath;
  } else {
    // Fall back to local path
    nativeHostPath = join(projectRoot, 'dist', 'browser', 'native-host');
  }
} catch (err) {
  // Fall back to local path if npm command fails
  nativeHostPath = join(projectRoot, 'dist', 'browser', 'native-host');
}

// Platform-specific manifest directory
function getManifestDir() {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS
    return join(
      homedir(),
      'Library',
      'Application Support',
      'Google',
      'Chrome',
      'NativeMessagingHosts'
    );
  } else if (platform === 'linux') {
    // Linux
    return join(
      homedir(),
      '.config',
      'google-chrome',
      'NativeMessagingHosts'
    );
  } else if (platform === 'win32') {
    // Windows - uses registry instead of file
    console.error('Windows installation requires registry editing. Please see README for manual installation steps.');
    process.exit(1);
  } else {
    console.error(`Unsupported platform: ${platform}`);
    process.exit(1);
  }
}

// Chrome Web Store Extension ID
const CHROME_WEB_STORE_EXTENSION_ID = 'ljdggojoihiofgflmpjffflhfjejndjg';

// Generate the native messaging host manifest
function generateManifest() {
  return {
    name: HOST_NAME,
    description: 'AI Live Log Bridge - Browser Monitoring Host',
    path: nativeHostPath,
    type: 'stdio',
    allowed_origins: [
      `chrome-extension://${CHROME_WEB_STORE_EXTENSION_ID}/`
    ]
  };
}

// Fix the shebang in the native host wrapper to use the local node path
function fixNativeHostShebang() {
  console.log('🔧 Fixing native host shebang for Chrome compatibility...');

  // Read the current wrapper
  const wrapperContent = readFileSync(nativeHostPath, 'utf-8');

  // Detect the node path on this system
  let nodePath;
  try {
    nodePath = execSync('which node', { encoding: 'utf-8' }).trim();
  } catch (err) {
    console.warn('⚠️  Could not detect node path, using /usr/bin/env node');
    nodePath = '/usr/bin/env node';
  }

  // Replace the shebang line
  const lines = wrapperContent.split('\n');
  if (lines[0].startsWith('#!')) {
    lines[0] = `#!${nodePath}`;
    const newContent = lines.join('\n');
    writeFileSync(nativeHostPath, newContent, 'utf-8');
    console.log(`✅ Shebang updated to: ${nodePath}\n`);
  } else {
    console.warn('⚠️  No shebang found in native host wrapper\n');
  }
}

// Main installation function
function install() {
  console.log('🔧 Installing Native Messaging Host...\n');

  // Check if native host exists
  if (!existsSync(nativeHostPath)) {
    console.error(`❌ Native host not found at: ${nativeHostPath}`);
    console.error('\nPlease build the project first:');
    console.error('  npm run build\n');
    process.exit(1);
  }

  // Fix the shebang for Chrome compatibility
  fixNativeHostShebang();

  // Get manifest directory
  const manifestDir = getManifestDir();
  console.log(`📁 Manifest directory: ${manifestDir}`);

  // Create directory if it doesn't exist
  if (!existsSync(manifestDir)) {
    console.log('📁 Creating manifest directory...');
    mkdirSync(manifestDir, { recursive: true });
  }

  // Generate manifest
  const manifest = generateManifest();
  const manifestPath = join(manifestDir, `${HOST_NAME}.json`);

  // Write manifest file
  console.log(`📝 Writing manifest to: ${manifestPath}`);
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log('\n✅ Native Messaging Host installed successfully!\n');
  console.log('📋 Next steps:');
  console.log('  1. Install the Chrome extension from Chrome Web Store:');
  console.log('     https://chromewebstore.google.com/detail/ai-live-terminal-bridge-b/ljdggojoihiofgflmpjffflhfjejndjg');
  console.log('  2. Refresh your localhost page in Chrome');
  console.log(`\n💡 The manifest file is located at: ${manifestPath}\n`);
}

// Run installation
try {
  install();
} catch (err) {
  console.error('❌ Installation failed:', err.message);
  process.exit(1);
}
