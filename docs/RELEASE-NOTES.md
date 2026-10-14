OpenSign is now available as a portable Mac download. No Node.js, npm, or Docker setup is required.

- **Apple M-series chip:** download `OpenSign-macos-arm64.zip`.
- **Intel Mac:** download `OpenSign-macos-x64.zip`.

Unzip the entire folder, then double-click **Start OpenSign.command**. Keep the Terminal window open while using the app. It opens the dashboard at http://127.0.0.1:3001. Your data is stored separately in `~/Library/Application Support/OpenSign/` and survives application restarts and replacement of the downloaded application folder.

These early builds are not Apple Developer ID signed or notarized. macOS may require approval in **System Settings → Privacy & Security → Open Anyway**. See `START-HERE.md` inside the download for details.

Both packages pass the dashboard-to-player browser workflow against their actual packaged executable before publication. This does not verify Gatekeeper approval, physical TVs, or long-running use on your Mac.

This is a local prototype without authentication or secure pairing. It is not a hosted staff website. Keep the default local-only binding; district-network deployment requires authentication, permissions, pairing, HTTPS, and a security review.
