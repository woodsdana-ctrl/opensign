# OpenSign

## Vision
Self-hosted image signage for Bemidji Area Schools, with straightforward staff tools and no per-device licensing.

## Current development phase
Version 1 MVP implemented and verified locally. Ready for the product owner's demonstration and hardware testing.

## Completed functionality
- JPG, PNG, and WebP uploads, decoded and re-encoded safely, with persistent media library.
- Playlist creation, image selection, reordering, removal, per-image durations, and transactional saves.
- Separate browser previews of saved playlists.
- Named screens, persistent playlist assignments, and unique development player URLs.
- Full-screen player layout with a 16:9 stage, image rotation, continuous looping, and five-second automatic update polling.
- Fallback for unassigned screens and failed images; connection-loss feedback and last-received playlist retention.
- Responsive dashboard, input validation, security headers, and cross-origin write rejection.
- Setup instructions, Docker-compatible configuration, and changelog.

## Verification completed
- TypeScript check and production build pass.
- API integration test passes: real uploads, rejected invalid uploads, validation, ordered playlists, durations, content changes, assignments, and database/media persistence after restarting the application.
- Chromium end-to-end workflow passes: three dashboard uploads, saved preview, Test TV assignment, separate player, ten-second timing and looping with a controlled clock, reordering and duration edits, automatic updates without refresh, missing-image fallback, and unassignment fallback.
- Desktop and mobile screenshots reviewed; mobile dashboard has no horizontal overflow.
- Dependency audit reports zero known vulnerabilities after upgrading Sharp to its patched release.
- Development servers start, and dashboard/API proxy endpoints return HTTP 200.

## Features in progress
- Product owner acceptance and physical TV testing.

## Known issues and limitations
- Local prototype has no authentication, permissions, or secure device registration. Do not deploy on the district network yet.
- Actual TV/browser longevity, full-screen controls, and district network behavior require manual testing.
- Docker configuration is provided but container execution has not been verified here.
- No guaranteed offline media caching. A player retains the received playlist during outages, but uncached images may be unavailable.
- Playlist changes restart playback at item one; preview displays saved changes only.

## Upcoming milestones
1. Product owner completes the documented Test TV demonstration, including a restart.
2. Add real authentication and server-side district/school permissions.
3. Add secure pairing, HTTPS, and complete a security review before a district network pilot.
4. Consider screen health, schedules, and offline caching after the secure pilot.

## Important architectural decisions
- React + TypeScript with Vite; Node 24 + Express API in one application. No microservices.
- SQLite with foreign keys, WAL journaling, and transactions; disk media stored independently of the web build. PostgreSQL can be considered if later concurrency or operational needs justify it.
- Uploaded images have generated filenames; file signatures and decoded format are checked, metadata removed, and images re-encoded to WebP.
- Player polling is deliberately simple; screen identity in the URL is explicitly development-only.
- Bind to localhost by default. Docker also publishes to localhost only.
- Branding is centralized in the UI and styles for later district customization.
