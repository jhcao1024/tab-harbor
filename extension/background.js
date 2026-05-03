/**
 * background.js — Service Worker
 *
 * Keeps Portus pages in sync when tabs change.
 * The toolbar badge is intentionally kept empty.
 */

console.log('[portus bg] Service worker loaded, registering event listeners...');

async function updateBadge() {
  try {
    await chrome.action.setBadgeText({ text: '' });
  } catch {
    chrome.action.setBadgeText({ text: '' });
  }
}

// ─── Event listeners ──────────────────────────────────────────────────────────

// Notify Portus pages when tabs change so they can refresh
let notifyDebounceTimer = null;
function scheduleNotifyTabHarborPages() {
  if (notifyDebounceTimer) clearTimeout(notifyDebounceTimer);
  notifyDebounceTimer = setTimeout(notifyTabHarborPages, 300);
}

async function notifyTabHarborPages() {
  try {
    const extensionId = chrome.runtime.id;
    const allTabs = await chrome.tabs.query({});

    const dashboardTabs = allTabs.filter(tab => {
      if (!tab.url) return false;
      // Portus can appear as either:
      // 1. chrome-extension://EXTENSION_ID/index.html (direct access)
      // 2. chrome://newtab/ with title "Portus" (new tab override)
      return (
        tab.url.startsWith(`chrome-extension://${extensionId}/index.html`) ||
        (tab.url === 'chrome://newtab/' && tab.title === 'Portus')
      );
    });

    for (const tab of dashboardTabs) {
      try {
        await chrome.tabs.sendMessage(tab.id, { action: 'tabs-changed' });
      } catch (err) {
        // Expected when the tab's page is still loading and hasn't registered
        // its message listener yet — not an error worth logging.
        if (!err.message.includes('Could not establish connection')) {
          console.warn(`[portus bg] Failed to notify tab ${tab.id}:`, err.message);
        }
      }
    }
  } catch (err) {
    console.warn('[portus bg] Error in notifyTabHarborPages:', err);
  }
}

// Update badge when the extension is first installed
chrome.runtime.onInstalled.addListener(() => {
  updateBadge();
});

// Update badge when Chrome starts up
chrome.runtime.onStartup.addListener(() => {
  updateBadge();
});

// Update badge and notify Portus pages whenever a tab is opened
chrome.tabs.onCreated.addListener(() => {
  updateBadge();
  scheduleNotifyTabHarborPages();
});

// Update badge and notify Portus pages whenever a tab is closed
chrome.tabs.onRemoved.addListener(() => {
  updateBadge();
  scheduleNotifyTabHarborPages();
});

// Update badge and notify Portus pages when a tab's URL changes (e.g. navigating to/from chrome://)
chrome.tabs.onUpdated.addListener(() => {
  updateBadge();
  scheduleNotifyTabHarborPages();
});

// ─── Initial run ─────────────────────────────────────────────────────────────

// Run once immediately when the service worker first loads
updateBadge();
