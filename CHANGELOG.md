# Changelog

## 0.1.0 — 2026-10-14

- Created the React/TypeScript dashboard and Node/SQLite application.
- Added safe image uploads and a persistent media library.
- Added playlist creation, image order controls, per-image duration, explicit saving, and saved previews.
- Added named screens with persistent playlist assignments and unique development player links.
- Added 16:9 browser playback, continuous looping, five-second update polling, missing-image fallback, and connection-loss feedback.
- Added input validation, cross-origin write protection, generated upload filenames, and security headers.
- Added API integration and browser workflow tests, local instructions, and Docker configuration.
- Verified production build, persistent API integration, and Chromium dashboard-to-player workflow, including timing, looping, live changes, and fallback behavior.
- Reviewed desktop/mobile presentation and checked mobile overflow.
- Upgraded Sharp to 0.35.5; dependency audit reports zero known vulnerabilities.

## 0.2.0 — 2026-10-14

- Added portable native executables with the Node runtime and image-processing libraries included.
- Added Mac launchers that open the dashboard in the browser without npm or Node installation.
- Store packaged Mac data in Application Support so replacing the application folder preserves it.
- Added Apple Silicon and Intel build jobs, packaged-executable browser tests, ZIP archives, checksums, and release publication.
- Added automated build/API/browser checks for normal source changes.
- Documented first-launch macOS approval and the limitations of unsigned local builds.
