/**
 * Content Script
 * Runs in ISOLATED world with access to Chrome extension APIs
 * Injects a script into MAIN world to capture console logs
 * Communicates via window.postMessage to bypass CSP
 */

(function() {
  'use strict';

  // Helper function to send message to background script
  function sendToBackground(message) {
    try {
      chrome.runtime.sendMessage({
        ...message,
        url: window.location.href,
        tabId: chrome.runtime.id,
        projectDir: window.location.origin, // Native host will determine actual project dir
        timestamp: Date.now()
      });
    } catch (err) {
      // Silently fail if extension context is invalid (e.g., during page unload)
    }
  }

  // ===== Listen for messages from MAIN world =====
  window.addEventListener('message', (event) => {
    // Only accept messages from same origin
    if (event.source !== window) return;

    // Check if it's our message
    if (event.data && event.data.__browserMonitor) {
      const data = event.data;
      delete data.__browserMonitor; // Remove marker
      sendToBackground(data);
    }
  });

  // ===== Inject script into MAIN world to capture console =====
  // Use chrome-extension:// URL which is allowed by CSP
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = () => {
    script.remove(); // Clean up after loading
  };
  (document.head || document.documentElement).appendChild(script);
})();
