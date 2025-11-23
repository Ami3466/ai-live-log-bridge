/**
 * Background Service Worker
 * Connects to the native messaging host (Node.js MCP server)
 * Forwards messages from content scripts to the native host
 * NO UI - Just message forwarding
 */

// Native messaging host name (must match scripts/install-native-host.js)
const HOST_NAME = 'com.ai_live_log_bridge.browser_monitor';

let port = null;
let isConnected = false;

/**
 * Connect to the native messaging host
 */
function connectNative() {
  console.log('[Background] Connecting to native host:', HOST_NAME);

  try {
    port = chrome.runtime.connectNative(HOST_NAME);

    port.onMessage.addListener((message) => {
      console.log('[Background] Received from native host:', message);
    });

    port.onDisconnect.addListener(() => {
      console.error('[Background] Disconnected from native host');
      if (chrome.runtime.lastError) {
        console.error('[Background] Error:', chrome.runtime.lastError.message);
      }
      isConnected = false;
      port = null;

      // Try to reconnect after 5 seconds
      setTimeout(connectNative, 5000);
    });

    isConnected = true;
    console.log('[Background] Connected to native host');
  } catch (err) {
    console.error('[Background] Failed to connect to native host:', err);
    isConnected = false;

    // Try to reconnect after 5 seconds
    setTimeout(connectNative, 5000);
  }
}

/**
 * Send message to native host
 */
function sendToNativeHost(message) {
  if (!port || !isConnected) {
    console.warn('[Background] Not connected to native host, attempting to connect...');
    connectNative();
    return;
  }

  try {
    // Chrome Native Messaging expects objects, not strings
    port.postMessage(message);
  } catch (err) {
    console.error('[Background] Failed to send message to native host:', err);
  }
}

/**
 * Handle messages from content scripts
 */
chrome.runtime.onMessage.addListener((message, sender) => {
  // Add sender tab information
  const enrichedMessage = {
    ...message,
    tabId: sender.tab?.id,
    tabUrl: sender.tab?.url,
    frameId: sender.frameId
  };

  // Forward to native host
  sendToNativeHost(enrichedMessage);

  // No response needed
  return false;
});

/**
 * Handle extension installation
 */
chrome.runtime.onInstalled.addListener((details) => {
  console.log('[Background] Extension installed:', details.reason);

  if (details.reason === 'install') {
    console.log('[Background] First time installation');
  } else if (details.reason === 'update') {
    console.log('[Background] Extension updated');
  }

  // Connect to native host
  connectNative();
});

/**
 * Connect on startup
 */
connectNative();

// Keep service worker alive by periodically pinging
setInterval(() => {
  if (port && isConnected) {
    sendToNativeHost({ type: 'heartbeat', timestamp: Date.now() });
  }
}, 30000); // Every 30 seconds
