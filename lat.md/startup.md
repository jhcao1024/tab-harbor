# Startup

Startup ordering keeps the workspace responsive and prevents theme flashes while optional resources load.

## Theme before dashboard initialization

The early theme scripts apply the saved palette before focus redirect, styles, and dashboard initialization. The startup theme tests verify this existing main behavior.

## Optional fonts never block the workspace

Optional web fonts initially load as print stylesheets and are enabled only after dashboard mounting, so unavailable fonts do not delay local content.

## Address bar focus by default

New tabs retain the browser's address-bar focus. The page has no autofocus attribute and only redirects or focuses its search input after an explicit settings opt-in.

Legacy `autoFocusSearchEnabled` values alone no longer enable page focus. Settings must also store `autoFocusSearchOptIn: true`; the early redirect reads only the new `portusAutoFocusSearchOptIn` mirror. Missing or inaccessible storage leaves the browser in control.

Tests cover fresh and legacy preferences, the opt-in redirect, and foreground focus guards. Browser verification waits beyond the old five-second retry window and verifies a native new-tab URL with the page search input unfocused.
