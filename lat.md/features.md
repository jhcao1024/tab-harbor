# Workspace features

The workspace combines open-tab organization, saved sessions, shortcuts, todos, and native bookmarks.

## Tab row multi-select and batch drag

Main's tab-row selection and batch drag behavior remains authoritative during bookmark integration; bookmark drag state and selectors stay separate from tab drag state.

## All-window tab workspace

Every dashboard lists tabs from all browser windows, including native Chrome groups. Action queries use the same global scope, and batch close protects the last tab of each window.

`fetchOpenTabs` retains tab ids, window ids, and group ids across windows. `queryUserChromeGroups` without a window id (or with null) queries all groups; explicit window ids remain supported. Clicking a remote tab focuses its existing window.

Window-specific actions, such as saving the current window or restoring into the current window, retain their explicit window filters. The popup already lists all windows.

Regression tests cover the all-window snapshot, optional group query scope, and preserving each remote window's last tab during batch close. Browser verification uses two real windows and a native group in the second window.
