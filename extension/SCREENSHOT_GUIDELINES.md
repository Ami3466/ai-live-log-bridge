# Screenshot Guidelines for Chrome Web Store

Since this extension has no visible UI, here are creative ways to create compelling screenshots for your Chrome Web Store listing.

## Requirements

- **Minimum**: 1 screenshot (1280x800 or 640x400)
- **Recommended**: 3-5 screenshots
- **Format**: PNG or JPEG
- **Size**: 1280x800 or 640x400 pixels

## Screenshot Ideas

### Screenshot 1: Extension in Action - Developer Workflow
**What to show:**
- Split screen showing:
  - Left: Chrome browser with localhost:3000 open, DevTools console visible
  - Right: Terminal showing the MCP server receiving logs in real-time
- Add text overlay: "Real-time log capture from localhost"

**How to capture:**
1. Run your dev server: `npm run dev`
2. Open localhost in Chrome with DevTools open
3. Run some console.log commands
4. Show terminal with MCP server logs
5. Take screenshot of entire screen
6. Crop to 1280x800

---

### Screenshot 2: Extension Management Page
**What to show:**
- `chrome://extensions/` page showing your extension installed
- Extension card with icon, name, and description visible
- "Inspect views: service worker" link highlighted
- Toggle showing extension is enabled

**How to capture:**
1. Navigate to `chrome://extensions/`
2. Ensure Developer mode is ON
3. Find your extension card
4. Zoom if needed to make it prominent
5. Screenshot and crop to 1280x800

**Optional text overlay**: "Easy installation and management"

---

### Screenshot 3: Console Logs Being Captured
**What to show:**
- Chrome DevTools Console tab open
- Multiple console.log, console.error, console.warn messages
- Highlight showing these logs are being monitored
- Arrow or annotation: "All of this is captured automatically"

**How to capture:**
1. Open Chrome DevTools (F12)
2. Run various console commands:
   ```javascript
   console.log('User logged in');
   console.error('API request failed');
   console.warn('Deprecated function called');
   fetch('/api/data');
   ```
3. Screenshot the console
4. Add annotations with an image editor

**Text overlay**: "Comprehensive console monitoring"

---

### Screenshot 4: Network Activity Monitoring
**What to show:**
- Chrome DevTools Network tab open
- Several fetch/XHR requests visible
- Headers and response data shown
- Annotation: "Network requests captured with full details"

**How to capture:**
1. Open Chrome DevTools → Network tab
2. Visit a localhost page that makes API calls
3. Show several requests in the list
4. Click one to show headers/response
5. Screenshot and annotate

**Text overlay**: "Track all network activity"

---

### Screenshot 5: Architecture Diagram
**What to create:**
- Visual diagram showing the flow:
  ```
  [Browser Console] → [Extension] → [Native Host] → [MCP Server] → [AI Assistant]
  ```
- Use simple icons for each component
- Arrows showing data flow
- Emphasis on "localhost only" and "stays on your machine"

**How to create:**
1. Use a diagram tool (draw.io, Excalidraw, Figma)
2. Create a simple flow diagram
3. Export as PNG at 1280x800
4. Add colors that match your extension icon

**Text overlay**: "Secure, local-only architecture"

---

## Alternative: Code Editor + Browser + Terminal

**What to show:**
- Three-panel view:
  - **Left**: VS Code with a React/Next.js project
  - **Top Right**: Chrome browser on localhost with your app running
  - **Bottom Right**: Terminal showing logs being received

**How to capture:**
1. Arrange windows in a 3-panel layout
2. Make sure code is readable
3. Browser shows your app at localhost:3000
4. Terminal shows active log streaming
5. Screenshot entire desktop
6. Crop to 1280x800

**Text overlay**: "Seamless integration with your development workflow"

---

## Quick Screenshot Template Ideas

### Template 1: Before/After
- **Before**: Developer manually copying console logs
- **After**: Extension automatically captures everything

### Template 2: Feature Highlights
Create a clean graphic showing:
- ✓ Console Logs
- ✓ Network Requests
- ✓ Error Tracking
- ✓ Performance Metrics
- ✓ Localhost Only
- ✓ Privacy First

### Template 3: Use Case Story
Show a mini-story in 3 panels:
1. Developer writes code
2. Bug appears in console
3. AI assistant (with extension data) suggests fix

---

## Tools You Can Use

### Screenshot Tools
- **macOS**: Cmd+Shift+4 (select area)
- **Windows**: Snipping Tool or Win+Shift+S
- **Linux**: GNOME Screenshot or Flameshot

### Annotation Tools
- **Figma** (free, web-based)
- **Excalidraw** (free, simple)
- **Canva** (free tier available)
- **Preview (macOS)** - Built-in annotation tools
- **GIMP** (free, powerful)

### Diagram Tools
- **draw.io** (free, web-based)
- **Excalidraw** (free, simple)
- **Mermaid** (code-based diagrams)

---

## Text Overlays (Optional but Recommended)

Add these text overlays to make screenshots more informative:

1. **"Localhost Only - Your data never leaves your machine"**
2. **"Real-time monitoring with zero configuration"**
3. **"Works with React, Vue, Angular, Next.js, and more"**
4. **"Open source and privacy-focused"**
5. **"AI-powered debugging made easy"**

---

## Design Tips

1. **Use consistent colors** that match your extension icon
2. **Keep text readable** - Use large fonts (24px+)
3. **Add arrows and highlights** to draw attention to key features
4. **Use real data** - Don't use Lorem Ipsum or fake logs
5. **Show realistic scenarios** - Actual code, actual errors
6. **Maintain aspect ratio** - 1280x800 or 640x400 only

---

## Example Screenshot Order

**Recommended order for your 5 screenshots:**

1. **Hero Shot**: Split screen showing browser + terminal with logs flowing
2. **Feature Overview**: Diagram or graphic showing what extension captures
3. **Console Monitoring**: DevTools console with captured logs
4. **Network Monitoring**: DevTools network tab with requests
5. **Extension Management**: chrome://extensions page showing extension

---

## Final Checklist

Before uploading screenshots:

- [ ] All screenshots are 1280x800 or 640x400 pixels
- [ ] Screenshots are PNG or JPEG format
- [ ] File size is under 5MB each
- [ ] Text is readable at preview size
- [ ] No personal/sensitive information visible
- [ ] Screenshots show the extension's value clearly
- [ ] Consistent visual style across all screenshots
- [ ] At least 1 screenshot uploaded (max 5)

---

## Need Help?

If you're not comfortable creating screenshots, consider:

1. **Hire a designer** on Fiverr ($10-30 for 5 screenshots)
2. **Use templates** from Canva Pro
3. **Ask ChatGPT/Claude** to generate HTML/CSS for screenshot mockups
4. **Use screenshot mockup generators** online

Remember: Screenshots are your first impression. Invest time to make them professional and informative!
