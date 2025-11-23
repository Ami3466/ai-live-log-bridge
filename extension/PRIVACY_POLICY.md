# Privacy Policy for AI Live Terminal Bridge - Browser Monitor

**Last Updated:** November 22, 2025

## Overview

AI Live Terminal Bridge - Browser Monitor is a Chrome extension designed for developers to monitor and debug their local development environments. This privacy policy explains what data is collected, how it's used, and your rights.

## Data Collection

### What We Collect

This extension collects the following data **only from localhost and development tunnel URLs**:

- **Console Logs**: All console output (log, info, warn, error, debug) from your localhost applications
- **Network Activity**: HTTP/HTTPS requests and responses made by your localhost applications
- **JavaScript Errors**: Error messages and stack traces from your localhost applications
- **Performance Metrics**: Page load times and resource timing from your localhost applications
- **Page Metadata**: URL, title, and timestamp of localhost pages you visit

### What We DO NOT Collect

- **NO personal information** (name, email, address, etc.)
- **NO browsing history** from non-localhost websites
- **NO data from regular websites** (only localhost:*, 127.0.0.1:*, and approved development tunnels)
- **NO passwords or credentials** (automatically redacted)
- **NO payment information**
- **NO tracking cookies or analytics**

## How Data Is Used

### Local Processing Only

All collected data:
- **Stays on your local machine** - Never transmitted to external servers
- **Stored locally** in `~/.mcp-logs/browser/` directory on your computer
- **Used only for debugging** - Accessible by AI tools running on your machine
- **Automatically redacted** - Sensitive data (tokens, API keys, cookies) is removed before storage

### No External Transmission

This extension:
- **Does NOT send data** to any remote servers
- **Does NOT communicate** with any third-party services
- **Does NOT share data** with anyone
- **Does NOT use analytics** or tracking services

## Data Storage and Security

### Local Storage

- All logs are stored in plain text files on your local machine
- Storage location: `~/.mcp-logs/browser/` directory
- Files are only accessible to your user account
- No cloud storage or synchronization

### Data Retention

- You control data retention - delete log files at any time
- No automatic cleanup (you manage your own logs)
- Extension can be uninstalled at any time, removing all functionality

### Security Measures

- **Automatic Redaction**: Cookies, authorization headers, API keys, and tokens are automatically redacted
- **Localhost Only**: Extension only monitors localhost and approved development tunnels
- **No Network Access**: Extension cannot access regular websites or make external connections
- **Native Messaging**: Communication with native host uses Chrome's secure native messaging protocol

## Permissions Explanation

### Required Permissions

- **nativeMessaging**: Required to communicate with the local native host application that processes logs
- **host_permissions**: Required to monitor these specific domains only:
  - `http://localhost:*/*` - Local development server
  - `http://127.0.0.1:*/*` - Local development server
  - `https://*.ngrok.io/*` - Ngrok development tunnels
  - `https://*.ngrok-free.app/*` - Ngrok free tunnels
  - `https://*.loca.lt/*` - Localtunnel development tunnels
  - `https://*.trycloudflare.com/*` - Cloudflare tunnels

### Why These Permissions

These permissions allow the extension to:
1. Inject monitoring scripts into your localhost pages
2. Capture console logs and network activity
3. Send captured data to the native host running on your machine

## Third-Party Services

This extension does **NOT** use any third-party services, including:
- No analytics (Google Analytics, etc.)
- No error tracking (Sentry, etc.)
- No advertising networks
- No social media integrations
- No external APIs

## Children's Privacy

This extension is intended for developers and is not directed at children under 13. We do not knowingly collect information from children.

## Your Rights and Control

You have complete control over your data:

### Access Your Data
- All logs are stored in `~/.mcp-logs/browser/`
- You can view, copy, or export logs at any time

### Delete Your Data
- Delete log files manually from `~/.mcp-logs/browser/`
- Uninstall the extension to stop all data collection
- No residual data remains on external servers (because none exists)

### Control Collection
- Enable/disable the extension at any time in `chrome://extensions/`
- Extension only monitors when you visit localhost URLs
- No background collection when not on localhost

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be posted:
- In this document
- On the GitHub repository: https://github.com/Ami3466/ai-live-log-bridge
- In the Chrome Web Store listing

Significant changes will be highlighted in release notes.

## Open Source

This extension is open source. You can:
- Review the complete source code: https://github.com/Ami3466/ai-live-log-bridge
- Verify what data is collected and how it's used
- Submit issues or contribute improvements
- Fork and modify for your own use

## Contact Information

If you have questions about this privacy policy or the extension:

- **GitHub Issues**: https://github.com/Ami3466/ai-live-log-bridge/issues
- **Email**: amit@lowenigne.cloud

## Developer Information

- **Developer**: Amit Elharar
- **Extension Homepage**: https://github.com/Ami3466/ai-live-log-bridge
- **License**: MIT License

## Compliance

This extension complies with:
- Chrome Web Store Developer Program Policies
- Chrome Extension Privacy Guidelines
- General Data Protection Regulation (GDPR) principles (data minimization, local storage, user control)

## Summary

In simple terms:
- ✅ Only monitors your localhost development sites
- ✅ All data stays on your computer
- ✅ No external servers or tracking
- ✅ You have full control over your data
- ✅ Open source and transparent
- ✅ Automatic security redaction
- ❌ No personal information collected
- ❌ No data sharing with third parties
- ❌ No remote transmission

---

**Note**: You must host this privacy policy at a publicly accessible URL (GitHub Pages, your website, etc.) and update the `manifest.json` with that URL before submitting to the Chrome Web Store.
