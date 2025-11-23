# Chrome Web Store Submission Checklist

## Before You Submit

### 1. Privacy Policy (REQUIRED)
- [x] Privacy policy created (PRIVACY_POLICY.md)
- [ ] Upload PRIVACY_POLICY.md to your GitHub repo
- [ ] Verify the privacy policy URL works: https://github.com/Ami3466/ai-live-log-bridge/blob/main/PRIVACY_POLICY.md
- [ ] Update YOUR_EMAIL_HERE in privacy policy
- [ ] Update YOUR_NAME_HERE in privacy policy

### 2. License
- [x] LICENSE file created
- [ ] Update YOUR_NAME_HERE in LICENSE file

### 3. Screenshots (REQUIRED - at least 1)
**Choose 3-5 from these options:**

**Option 1: Developer Workflow (RECOMMENDED)**
- Open Chrome to localhost:3000
- Open DevTools console
- Run some console.log commands
- Open terminal showing MCP server receiving logs
- Screenshot both side by side
- Resize to 1280x800

**Option 2: Chrome Extensions Page**
- Go to chrome://extensions/
- Enable Developer mode
- Show your extension installed and enabled
- Screenshot the extension card
- Resize to 1280x800

**Option 3: Console Logs**
- Open DevTools console
- Run multiple console commands (log, error, warn)
- Screenshot showing various log types
- Add text overlay: "All console logs captured automatically"
- Resize to 1280x800

**Option 4: Simple Diagram**
- Create flow: Browser → Extension → Native Host → MCP → AI
- Use draw.io or Excalidraw
- Export as 1280x800 PNG
- Add text: "Secure, local-only architecture"

### 4. Promotional Images
- [ ] Create 440x280 small promo tile (REQUIRED for featured placement)
- [ ] Optional: 920x680 large promo tile
- [ ] Optional: 1400x560 marquee promo tile

**Quick promo tile idea:**
- Use your logo/icon
- Add text: "AI Live Terminal Bridge"
- Subtitle: "Localhost debugging for AI"
- Background color matching your icon

### 5. Extension Files
- [x] manifest.json configured
- [x] Icons present (16, 48, 128)
- [x] background.js present
- [x] content.js present
- [x] injected.js present
- [ ] Test extension works on localhost
- [ ] No console errors in service worker

### 6. Store Listing Content
- [x] Store description written (see STORE_DESCRIPTION.md)
- [ ] Copy short description (132 chars max)
- [ ] Copy detailed description
- [ ] Select category: Developer Tools
- [ ] Add language: English

### 7. Developer Account
- [ ] Create Google Chrome Web Store developer account ($5 one-time fee)
- [ ] Verify email address
- [ ] Set up payment method (if publishing paid extensions)

### 8. Final Testing
- [ ] Load extension in Chrome (Developer mode)
- [ ] Visit localhost:3000 (or any localhost page)
- [ ] Check service worker console for errors
- [ ] Verify logs are captured in ~/.mcp-logs/browser/
- [ ] Test on clean Chrome profile (incognito won't work with extensions)

## Submission Steps

1. **Go to Chrome Web Store Developer Dashboard**
   - Visit: https://chrome.google.com/webstore/devconsole
   - Sign in with Google account
   - Pay $5 developer fee (one-time)

2. **Create New Item**
   - Click "New Item"
   - Upload ZIP file of your extension folder

3. **Fill Out Store Listing**
   - Detailed description (from STORE_DESCRIPTION.md)
   - Category: Developer Tools
   - Language: English
   - Upload screenshots (1-5)
   - Upload promotional tiles (at least 440x280)

4. **Privacy**
   - Add privacy policy URL: https://github.com/Ami3466/ai-live-log-bridge/blob/main/PRIVACY_POLICY.md
   - Justification for permissions:
     - nativeMessaging: Required to communicate with local MCP server
     - host_permissions: Required to monitor localhost and dev tunnels only

5. **Distribution**
   - Select visibility: Public or Unlisted
   - Select regions (or worldwide)

6. **Submit for Review**
   - Click "Submit for Review"
   - Review typically takes 1-3 days
   - You'll get email when approved/rejected

## Common Rejection Reasons (Avoid These)

- ❌ No privacy policy or broken privacy policy URL
- ❌ Privacy policy doesn't explain permissions
- ❌ No screenshots or poor quality screenshots
- ❌ Misleading description
- ❌ Extension doesn't work as described
- ❌ Contains malware or suspicious code
- ❌ Violates Chrome Web Store policies

## After Submission

- [ ] Monitor email for review status
- [ ] If rejected, fix issues and resubmit
- [ ] If approved, share extension link!
- [ ] Add Chrome Web Store badge to GitHub README

## Quick Screenshot Guide

**For a no-UI extension, here's the simplest approach:**

1. **Screenshot 1**: Split screen
   - Left: Chrome with localhost open + DevTools console
   - Right: Terminal with MCP server logs
   - Show logs flowing in real-time

2. **Screenshot 2**: chrome://extensions/ page
   - Your extension card visible
   - Extension enabled
   - Clean and simple

3. **Screenshot 3**: Architecture diagram
   - Simple flow chart
   - Shows how extension works
   - Use draw.io (takes 5 minutes)

**That's enough! 3 screenshots is perfect.**

## Need Help?

- Chrome Web Store Policies: https://developer.chrome.com/docs/webstore/program-policies/
- Developer Dashboard: https://chrome.google.com/webstore/devconsole
- Extension Best Practices: https://developer.chrome.com/docs/extensions/mv3/

---

**Estimated time to complete:** 1-2 hours (mostly screenshots and account setup)

**Cost:** $5 one-time developer registration fee

**Review time:** 1-3 business days typically
