'use strict';

(function attachTabHarborTabUrlUtils(globalScope) {
  const RESTORABLE_PROTOCOLS = new Set(['http:', 'https:', 'file:']);
  const INTERNAL_PROTOCOLS = new Set([
    'about:',
    'brave:',
    'chrome:',
    'chrome-extension:',
    'edge:',
    'extension:',
  ]);

  function safeDecode(value = '') {
    try {
      return decodeURIComponent(String(value || ''));
    } catch {
      return String(value || '');
    }
  }

  function parseSuspendedTabUrl(url = '') {
    const raw = String(url || '').trim();
    const emptyResult = {
      isSuspended: false,
      originalUrl: '',
      title: '',
    };
    if (!raw) return emptyResult;

    let parsed;
    try {
      parsed = new URL(raw);
    } catch {
      return emptyResult;
    }

    const protocol = parsed.protocol.toLowerCase();
    const pathname = parsed.pathname || '';
    if (protocol !== 'extension:' && protocol !== 'chrome-extension:') {
      return emptyResult;
    }

    if (!pathname.endsWith('/suspended.html') && pathname !== '/suspended.html') {
      return emptyResult;
    }

    const hash = raw.includes('#') ? raw.slice(raw.indexOf('#') + 1) : '';
    const params = new URLSearchParams(hash);
    const originalUrl = safeDecode(params.get('uri') || '').trim();
    const title = safeDecode(params.get('ttl') || '').trim();

    return {
      isSuspended: true,
      originalUrl,
      title,
    };
  }

  function getCanonicalTabUrl(url = '') {
    const raw = String(url || '').trim();
    if (!raw) return '';
    const suspended = parseSuspendedTabUrl(raw);
    if (suspended.isSuspended && suspended.originalUrl) return suspended.originalUrl;
    return raw;
  }

  function isRestorableTabUrl(url = '') {
    const canonicalUrl = getCanonicalTabUrl(url);
    if (!canonicalUrl) return false;

    try {
      const parsed = new URL(canonicalUrl);
      if (RESTORABLE_PROTOCOLS.has(parsed.protocol)) return true;
      if (INTERNAL_PROTOCOLS.has(parsed.protocol)) return false;
      return false;
    } catch {
      return false;
    }
  }

  const api = {
    getCanonicalTabUrl,
    isRestorableTabUrl,
    parseSuspendedTabUrl,
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = api;
  }

  globalScope.TabHarborTabUrlUtils = api;
})(typeof globalThis !== 'undefined' ? globalThis : window);
