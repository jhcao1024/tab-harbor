# Workspace features

The workspace combines open-tab organization, saved sessions, shortcuts, todos, and native bookmarks.

## Tab row multi-select and batch drag

Main's tab-row selection and batch drag behavior remains authoritative during bookmark integration; bookmark drag state and selectors stay separate from tab drag state.

## All-window tab workspace

Every dashboard lists tabs from all browser windows, including native Chrome groups. Action queries use the same global scope, and batch close protects the last tab of each window.

`fetchOpenTabs` retains tab ids, window ids, and group ids across windows. `queryUserChromeGroups` without a window id (or with null) queries all groups; explicit window ids remain supported. Clicking a remote tab focuses its existing window.

Explicit window-specific runtime actions and restoring into the current window retain their window filters. The popup already lists all windows.

Regression tests cover the all-window snapshot, optional group query scope, and preserving each remote window's last tab during batch close. Browser verification uses two real windows and a native group in the second window.

## Wrapping group navigation

The Open Tabs group icons use fixed-size grid tracks and wrap into additional rows as space runs out. The dashboard no longer redirects vertical wheel input into horizontal navigation scrolling.

Drag targets use slot rectangles captured at pointer-down, including both horizontal and vertical position. A separate inert ghost follows the pointer while a placeholder occupies the grid. Only a successful drop persists the order; Escape and pointer cancellation discard previews.

Browser checks use 24 groups at desktop and narrow widths and verify cross-row drag, reload persistence, cancellation, and keyboard activation. The popup retains its independent layout.

## Saved tab storage

Saved sessions live in the current browser profile's extension-local storage under `savedTabSessions`. They contain URLs, titles, favicon URLs, and group metadata rather than offline page content.

`extension/tab-sessions.js` reads and writes this data through `chrome.storage.local`. `extension/config-sync.js` includes sessions in JSON configuration exports. Bookmarks use the browser's separate native bookmark store.

## Workspace menu above group icons

The top menu uses the footer's number-over-label style for the all-window Open Tabs count, followed by extra-dashboard cleanup, Home/Saved tabs navigation, and desk settings. Group icons occupy the separate row below.

Duplicate-URL cleanup, merge into Chrome groups, save session, sleep, and close-all actions remain in their original Open Tabs section header. The menu remains available on both workspace pages, including empty states. The dashboard alone handles Home's save action.

## All-window session saving

Save Session offers restorable tabs from every window, matching the Open Tabs workspace. Group selection remains available, including groups spanning windows.

The empty picker says “No tabs available to save.” (Chinese: “没有可保存的网页标签页。”), without limiting the message to the current window.

The picker records `all-windows` as its source. Saving persists selected tabs before closing them through the existing per-window last-tab protection. Group-scoped and individual selections still limit which tabs are saved.

## Concurrent session writes

Session mutations acquire one exclusive Web Lock shared by extension pages before reading storage, preventing simultaneous saves in different windows from overwriting each other.

Add, delete, rename, append, replace, and configuration import use the same lock. It covers the complete read-modify-write operation and releases after both success and failure. Storage failures reject before source tabs can be closed.

Regression coverage uses independent page contexts sharing a lock manager, concurrent save and rename, and recovery after storage failure. An isolated Edge run saved 20 sessions from two extension pages concurrently and retained all 20.
