# Bookmark integration

The feature branch combines main's workspace runtime with a native Chrome bookmarks view in the home rail, without replacing main's tab, session, search, or popup behavior.

## Startup and permissions

The bookmarks script loads after dashboard-runtime.js. app.js starts bookmark rendering after configuration, localization, and dashboard mounting; bookmark errors do not block the workspace.

Both unpacked manifests include bookmarks permission and equivalent options-page paths. Bookmarks use Chrome's bookmark store; they are not duplicated into configuration backups.

## Keyboard navigation

Folder names and breadcrumb steps are native buttons. Open, delete, back, and reorder controls have localized accessible labels, with visible focus indicators.

The render regression test exercises folder and bookmark output. In a browser, focus a folder title, press Enter, and use Back to verify navigation.

## Responsive rail

The home rail contains greeting, shortcuts, and bookmarks. At widths of 960px or less, the rail occupies column one with automatic row placement, avoiding an implicit second column.

## Drag previews

Bookmarks use a separate inert ghost above the page and an inert placeholder in the list. Main's invisible tab-drag source styling must not hide the bookmark preview. Escape and pointer cancellation remove the preview without persisting an order.

Browser verification: drag Example A below Example B, check Chrome's stored order, then test cancellation. Folder and breadcrumb drop targets retain the feature branch's move behavior.

## Merge validation

Merge resolution preserves main's tab batching, session restore, background notifications, popup grouping, early theme startup, and script order. Portus branding and the bookmark UI remain on feat/bookmark.

Run `node --test extension/*.test.js` and `lat check`. Verify the actual unpacked extension in an isolated browser at desktop and 600px widths, including bookmark keyboard navigation and drag persistence.
