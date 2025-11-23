/**
 * Injected Script - Runs in MAIN world
 * Captures console logs, errors, and network activity
 * Sends data to content script via window.postMessage
 */

(function() {
  'use strict';

  // Save original console methods
  const originalConsole = {
    log: console.log.bind(console),
    info: console.info.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
    debug: console.debug.bind(console)
  };

  // Override console methods
  ['log', 'info', 'warn', 'error', 'debug'].forEach(level => {
    console[level] = function(...args) {
      // Call original first
      originalConsole[level](...args);

      // Convert to string
      const text = args.map(arg => {
        if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg, null, 2);
          } catch (e) {
            return String(arg);
          }
        }
        return String(arg);
      }).join(' ');

      // Send to content script via postMessage
      window.postMessage({
        __browserMonitor: true,
        type: 'console',
        level: level,
        text: text
      }, '*');
    };
  });

  // ===== Error Capturing =====

  // Capture unhandled errors
  window.addEventListener('error', (event) => {
    window.postMessage({
      __browserMonitor: true,
      type: 'error',
      text: event.message,
      stackTrace: {
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? event.error.stack : null
      }
    }, '*');
  });

  // Capture unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    window.postMessage({
      __browserMonitor: true,
      type: 'error',
      text: `Unhandled Promise Rejection: ${event.reason}`,
      stackTrace: {
        reason: String(event.reason)
      }
    }, '*');
  });

  // ===== Network Monitoring =====

  // Monitor fetch requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = typeof args[0] === 'string' ? args[0] : args[0]?.url;
    const method = args[1]?.method || 'GET';
    const startTime = Date.now();

    return originalFetch.apply(this, args).then(response => {
      const duration = Date.now() - startTime;

      // Send network event
      window.postMessage({
        __browserMonitor: true,
        type: 'network',
        method: method,
        url: url,
        status: response.status,
        duration: duration
      }, '*');

      return response;
    }).catch(error => {
      const duration = Date.now() - startTime;

      // Send failed network event
      window.postMessage({
        __browserMonitor: true,
        type: 'network',
        method: method,
        url: url,
        status: 0,
        duration: duration,
        error: error.message
      }, '*');

      throw error;
    });
  };

  // Monitor XMLHttpRequest
  const originalXHROpen = XMLHttpRequest.prototype.open;
  const originalXHRSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function(method, url) {
    this._method = method;
    this._url = url;
    this._startTime = Date.now();
    return originalXHROpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function() {
    const xhr = this;

    xhr.addEventListener('loadend', function() {
      const duration = Date.now() - xhr._startTime;

      window.postMessage({
        __browserMonitor: true,
        type: 'network',
        method: xhr._method,
        url: xhr._url,
        status: xhr.status,
        duration: duration
      }, '*');
    });

    return originalXHRSend.apply(this, arguments);
  };

  // ===== Performance Monitoring (Optional) =====

  // Monitor performance metrics periodically
  setInterval(() => {
    if (window.performance && window.performance.memory) {
      window.postMessage({
        __browserMonitor: true,
        type: 'performance',
        metric: 'memory',
        value: window.performance.memory.usedJSHeapSize
      }, '*');
    }
  }, 10000); // Every 10 seconds

  // ===== Initialization =====

  // Send session start message
  window.postMessage({
    __browserMonitor: true,
    type: 'session-start',
    url: window.location.href
  }, '*');

  // Send session end on page unload
  window.addEventListener('beforeunload', () => {
    window.postMessage({
      __browserMonitor: true,
      type: 'session-end'
    }, '*');
  });
})();
