# Startup

Startup ordering keeps the workspace responsive and prevents theme flashes while optional resources load.

## Theme before dashboard initialization

The early theme scripts apply the saved palette before focus redirect, styles, and dashboard initialization. The startup theme tests verify this existing main behavior.

## Optional fonts never block the workspace

Optional web fonts initially load as print stylesheets and are enabled only after dashboard mounting, so unavailable fonts do not delay local content.
