# Adding Custom Domains to Browser Monitoring

> **Note:** This guide requires the Chrome extension to be installed. Install from Chrome Web Store: **[AI Live Terminal Bridge](https://chromewebstore.google.com/detail/ai-live-terminal-bridge-b/ljdggojoihiofgflmpjffflhfjejndjg)**

By default, the browser extension monitors:
- `localhost:*`
- `127.0.0.1:*`
- `*.ngrok.io` (ngrok tunnels)
- `*.ngrok-free.app` (ngrok free tier)
- `*.loca.lt` (localtunnel)
- `*.trycloudflare.com` (Cloudflare Tunnel)

## Why Add Custom Domains?

You might want to add custom domains for:
- **Custom dev domains**: `*.myapp.test`, `*.local.dev`
- **Staging environments**: `staging.myapp.com`, `*.staging.myapp.com`
- **Other tunnel services**: Tailscale Funnel, ngrok alternatives
- **Company internal tools**: `*.internal.company.com`

## How to Add Custom Domains

### Step 1: Locate the Extension

Find your extension's source code. If you installed from the Chrome Web Store, you'll need to access Chrome's extension files or contact the extension developer for customization options.

### Step 2: Edit the Manifest

Open the manifest file:
```bash
# Use your preferred editor:
code manifest.json
# or
nano manifest.json
# or
vim manifest.json
```

### Step 3: Add Your Domains

Find the `host_permissions` and `content_scripts` sections and add your domain patterns:

```json
{
  "manifest_version": 3,
  "name": "AI Live Log Bridge - Browser Monitor",
  "version": "1.0.0",
  "permissions": [
    "nativeMessaging"
  ],
  "host_permissions": [
    "http://localhost:*/*",
    "http://127.0.0.1:*/*",
    "https://*.ngrok.io/*",
    "https://*.ngrok-free.app/*",
    "https://*.loca.lt/*",
    "https://*.trycloudflare.com/*",

    // ADD YOUR CUSTOM DOMAINS HERE:
    "https://*.myapp.test/*",           // Custom dev domain
    "https://staging.myapp.com/*",       // Staging environment
    "https://*.staging.myapp.com/*",     // Staging subdomains
    "https://*.tunnel.example.com/*"     // Custom tunnel
  ],
  "content_scripts": [
    {
      "matches": [
        "http://localhost:*/*",
        "http://127.0.0.1:*/*",
        "https://*.ngrok.io/*",
        "https://*.ngrok-free.app/*",
        "https://*.loca.lt/*",
        "https://*.trycloudflare.com/*",

        // ADD THE SAME DOMAINS HERE:
        "https://*.myapp.test/*",
        "https://staging.myapp.com/*",
        "https://*.staging.myapp.com/*",
        "https://*.tunnel.example.com/*"
      ],
      "js": ["content.js"],
      "run_at": "document_start"
    }
  ]
}
```

**Important:** You must add domains to BOTH `host_permissions` AND `content_scripts.matches`!

### Step 4: Reload the Extension

1. Open Chrome → `chrome://extensions/`
2. Find "AI Live Log Bridge - Browser Monitor"
3. Click the **Reload** button (↻ icon)

### Step 5: Test It

1. Visit your custom domain (e.g., `https://staging.myapp.com`)
2. Open DevTools (F12) → Console
3. Type: `console.log("Testing custom domain")`
4. Check browser logs:
   ```bash
   cat ~/.mcp-logs/browser/active/*.log
   ```
5. Should see the log message captured!

---

## Pattern Matching Examples

### Wildcards

Chrome supports wildcard patterns for subdomains:

```json
// Matches ALL subdomains
"https://*.example.com/*"
// → https://app.example.com
// → https://staging.example.com
// → https://abc.example.com

// Matches ONLY specific domain
"https://staging.example.com/*"
// → https://staging.example.com
// ✗ https://app.example.com (no match)

// Matches all ports on localhost
"http://localhost:*/*"
// → http://localhost:3000
// → http://localhost:8080
// → http://localhost:5173
```

### HTTP vs HTTPS

```json
// HTTP only
"http://example.local/*"

// HTTPS only
"https://example.com/*"

// BOTH HTTP and HTTPS (add both)
"http://example.com/*",
"https://example.com/*"
```

### Path Matching

```json
// Match all paths (recommended)
"https://example.com/*"

// Match specific path only
"https://example.com/app/*"

// Match exact path
"https://example.com/dashboard"
```

---

## Common Use Cases

### Case 1: Local .test Domains

If you use `.test` domains via dnsmasq:

```json
"host_permissions": [
  "http://*.test/*",
  "https://*.test/*"
],
"content_scripts": [{
  "matches": [
    "http://*.test/*",
    "https://*.test/*"
  ],
  ...
}]
```

**Example:**
- `http://myapp.test`
- `http://api.myapp.test`

### Case 2: Staging Environment

Monitor your staging server:

```json
"host_permissions": [
  "https://staging.myapp.com/*",
  "https://*.staging.myapp.com/*"
],
"content_scripts": [{
  "matches": [
    "https://staging.myapp.com/*",
    "https://*.staging.myapp.com/*"
  ],
  ...
}]
```

**Example:**
- `https://staging.myapp.com`
- `https://api.staging.myapp.com`

### Case 3: Vercel Preview Deployments

Monitor Vercel preview URLs:

```json
"host_permissions": [
  "https://*.vercel.app/*"
],
"content_scripts": [{
  "matches": [
    "https://*.vercel.app/*"
  ],
  ...
}]
```

**Example:**
- `https://my-app-git-feature-branch-username.vercel.app`
- `https://my-app-abc123.vercel.app`

### Case 4: Netlify Deploy Previews

```json
"host_permissions": [
  "https://*.netlify.app/*"
],
"content_scripts": [{
  "matches": [
    "https://*.netlify.app/*"
  ],
  ...
}]
```

### Case 5: Tailscale Funnel

If you use Tailscale Funnel for sharing:

```json
"host_permissions": [
  "https://*.tailscale.io/*"
],
"content_scripts": [{
  "matches": [
    "https://*.tailscale.io/*"
  ],
  ...
}]
```

---

## Security Considerations

### ⚠️ Be Careful with Wildcards

**Bad example (too broad):**
```json
// DON'T DO THIS - Matches EVERY .com site!
"https://*.com/*"
```

**Good example (specific):**
```json
// Good - Only matches your domains
"https://*.myapp.com/*"
```

### ⚠️ Don't Add Production Sites

**Avoid adding:**
```json
// BAD - Production site
"https://myapp.com/*"

// BAD - Public API
"https://api.myapp.com/*"
```

**Why?**
- Extension captures ALL console logs and network requests
- Production sites may handle sensitive customer data
- Could slow down production browsing
- Logs would contain real user data

**Better:**
- Use separate staging domains
- Use feature flags to disable logging in production
- Only monitor development/staging environments

### ✅ Safe Patterns

These are generally safe:
- Local development domains: `*.test`, `*.local`, `*.dev.local`
- Tunnels: `*.ngrok.io`, `*.loca.lt`
- Staging: `*.staging.myapp.com`, `*.dev.myapp.com`
- Preview deploys: `*.vercel.app`, `*.netlify.app` (your projects only)

---

## Troubleshooting

### Extension Not Capturing on Custom Domain

**1. Check manifest syntax:**
```bash
# Validate JSON
python3 -m json.tool manifest.json
```

**2. Verify domain is in BOTH places:**
- ✅ `host_permissions`
- ✅ `content_scripts.matches`

**3. Reload extension:**
- `chrome://extensions/` → Click reload button

**4. Hard refresh the page:**
- Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows/Linux)

**5. Check extension console:**
```
chrome://extensions/
→ Find "AI Live Log Bridge"
→ Click "Inspect views: service worker"
→ Look for errors
```

### Patterns Not Matching

**Problem:** Domain doesn't match pattern

**Common mistakes:**

```json
// ❌ WRONG - Missing trailing /*
"https://*.example.com"

// ✅ CORRECT
"https://*.example.com/*"

// ❌ WRONG - Wrong protocol
"http://staging.example.com/*"  // Site uses HTTPS

// ✅ CORRECT
"https://staging.example.com/*"

// ❌ WRONG - Too specific
"https://example.com/app/dashboard"

// ✅ CORRECT - Matches all paths
"https://example.com/*"
```

---

## Template for Quick Copy-Paste

```json
{
  "host_permissions": [
    "http://localhost:*/*",
    "http://127.0.0.1:*/*",
    "https://*.ngrok.io/*",
    "https://*.ngrok-free.app/*",
    "https://*.loca.lt/*",
    "https://*.trycloudflare.com/*",
    "YOUR_DOMAIN_HERE"
  ],
  "content_scripts": [
    {
      "matches": [
        "http://localhost:*/*",
        "http://127.0.0.1:*/*",
        "https://*.ngrok.io/*",
        "https://*.ngrok-free.app/*",
        "https://*.loca.lt/*",
        "https://*.trycloudflare.com/*",
        "YOUR_DOMAIN_HERE"
      ],
      "js": ["content.js"],
      "run_at": "document_start",
      "all_frames": false
    }
  ]
}
```

Replace `YOUR_DOMAIN_HERE` with your pattern (e.g., `"https://*.staging.myapp.com/*"`).

---

## Need Help?

- **Pattern matching docs**: [Chrome Match Patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns)
- **Permissions docs**: [Chrome Permissions](https://developer.chrome.com/docs/extensions/reference/permissions)
- **Issues**: [GitHub Issues](https://github.com/Ami3466/ai-live-log-bridge/issues)
