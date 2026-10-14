# OpenSign

Self-hosted image signage for Bemidji Area Schools. Version 1 includes a real media library, persistent playlists, screen assignment, and a separate browser player.

## Run locally

Install **Node.js 24 LTS**. In this project folder:

```sh
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Keep the terminal running. Stop with Ctrl+C; repeat `npm start` to restart. Data is stored in `data/opensign.sqlite` and `data/media/`, independently of the build. Do not delete `data/`.

For development with automatic code reload:

```sh
npm run dev
```

Open **http://127.0.0.1:5173**. The development frontend forwards API and media requests to port 3001. `npm start` serves the built frontend and API together on port 3001. Run only one mode at a time.

## Test the Version 1 demonstration

1. In **Screens**, create **Test TV**.
2. In **Media library**, upload three JPG, PNG, or WebP images.
3. In **Playlists**, create **Morning Announcements**.
4. Select each image from **Add an image**. Each defaults to **10 seconds**.
5. Click **Save playlist**. Use **Preview saved playlist** to check it in another tab.
6. In **Screens**, choose **Morning Announcements** for Test TV. Assignments save immediately.
7. Click **Open player**. Move the new tab into a separate window if desired; use the browser's full-screen command (usually F11).
8. Watch all three images rotate every 10 seconds and repeat.
9. Return to the playlist, change the order using the arrow buttons, remove or add an image, or change its duration. Click **Save playlist**.
10. The player should use the new playlist within **5 seconds**, without reloading. An update restarts the loop at its first image.
11. Stop and restart the application, then revisit the dashboard and the same player URL. Verify the images, playlist order, durations, and screen assignment persist.
12. Assign **No playlist** to see the player fallback. Stop the server while a player is running to see the connection warning; already received content continues while available in the browser.

## Automated verification

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
```

The integration test uses temporary database and upload directories. It checks actual upload decoding, invalid uploads, name/duration validation, ordering, assignment, content changes, cross-origin write rejection, and persistence across an application restart. The browser test creates three images through the dashboard, previews and assigns the playlist, uses a separate player page, checks 10-second rotation and looping with a controlled browser clock, reorders the playlist, changes timing, and verifies automatic updates and missing-image fallback.

Browser tests use a unique temporary directory under `/tmp/opensign-browser-*` each run. These test-only directories can be removed afterward. The test server requires port 3001 to be free. Manual checks still needed: physical TV full-screen behavior, long-running browser stability, and actual district hardware/network operation.

## Docker

```sh
docker compose up --build -d
```

Open http://127.0.0.1:3001. SQLite and uploads persist in the `opensign-data` named volume. `docker compose down` preserves it; `docker compose down -v` deletes it. Docker configuration is provided; container execution has not been verified in this environment.

## Architecture

- `src/main.tsx`: React dashboard and player; `src/style.css`: responsive presentation.
- `server/app.ts`: API, validation, image processing, and SQLite schema.
- `server/index.ts`: process startup and graceful shutdown.
- `tests/`: API integration and Playwright workflow tests.
- `PROJECT.md`: implementation status and next milestones.

One Node process serves the frontend, API, and media. SQLite uses foreign keys, WAL journaling, and transactional playlist updates. Images are decoded with Sharp, limited to 10 MB / 40 megapixels, stripped of metadata, and re-encoded as WebP under generated filenames. Screen URLs carry a unique generated ID. Players poll every five seconds, fit images in a 16:9 stage, and preserve image proportions with black margins when necessary.

Optional runtime environment variables: `PORT` (default 3001), `HOST` (default 127.0.0.1), `DATA_DIR` (default `data`). No credentials are required or hardcoded.

## Prototype limitations and deployment boundary

This is a **local development prototype with no authentication, permissions, or secure pairing**. Anyone who can reach the application can manage its content. The default local and Docker bindings keep it on the host machine. Do not expose it to the district network until real authentication, server-side authorization, secure device pairing, HTTPS, and a security review are complete.

Version 1 handles still images only. No schedules, emergency overrides, screen health status, or guaranteed offline caching are implemented. The dashboard does not claim a screen is online. Playlist edits must be saved; preview shows the saved version. Player polling applies changes immediately, restarting at item one. Persistent storage needs backups: stop the server and copy the entire data directory (or Docker volume), then restore it as a unit.

The next recommended milestone is authentication and district permissions, followed by secure device pairing before any network pilot.
