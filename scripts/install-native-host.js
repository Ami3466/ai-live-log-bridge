#!/usr/bin/env node

/**
 * Native Messaging Host Installation Script
 * Registers the native messaging host with Chrome/Chromium browsers
 * Must be run after building the project
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Native messaging host ID (must match manifest.json in extension)
const HOST_NAME = 'com.ai_live_log_bridge.browser_monitor';

// Get the absolute path to the native host executable
const projectRoot = join(__dirname, '..');
const nativeHostPath = join(projectRoot, 'dist', 'browser', 'native-host');

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

// Generate the native messaging host manifest
function generateManifest() {
  return {
    name: HOST_NAME,
    description: 'AI Live Log Bridge - Browser Monitoring Host',
    path: nativeHostPath,
    type: 'stdio',
    allowed_origins: [
      `chrome-extension://YOUR_EXTENSION_ID/` // Will be updated after extension installation
    ]
  };
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
  console.log('  1. Download and unzip the Chrome extension (see README.md for download link)');
  console.log('  2. Load the extension in Chrome (chrome://extensions → "Load unpacked")');
  console.log('  3. Copy the extension ID from chrome://extensions');
  console.log('  4. Run: npm run update-extension-id <EXTENSION_ID>');
  console.log(`\n💡 The manifest file is located at: ${manifestPath}\n`);
}

// Run installation
try {
  install();
} catch (err) {
  console.error('❌ Installation failed:', err.message);
  process.exit(1);
}
