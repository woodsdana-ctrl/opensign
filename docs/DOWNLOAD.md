# Start OpenSign on your Mac

No Node.js, npm, or Docker installation is needed. This is the same image-signage application as the source project, packaged with its runtime and image libraries.

1. Choose the download matching **Apple menu → About This Mac**:
   - **Apple Silicon** (an Apple M-series chip): `OpenSign-macos-arm64.zip`.
   - **Intel** processor: `OpenSign-macos-x64.zip`.
2. Unzip the download and move the entire OpenSign folder somewhere convenient, such as your Applications folder. Keep the files together; do not run it from inside the ZIP.
3. Double-click **Start OpenSign.command** inside the folder. It opens Terminal and starts the app, then opens your default browser at **http://127.0.0.1:3001**.
4. Leave the Terminal window running while using the dashboard or player. Stop with **Ctrl+C** in that window. Double-click the launcher again to restart.

## First-launch approval

These early releases are not Apple Developer ID signed or notarized. macOS may block the launcher or executable. If you trust this download from the OpenSign GitHub repository, use **System Settings → Privacy & Security → Open Anyway** for the blocked file and follow macOS's approval prompts. You may need to approve the launcher and executable separately. We do not disable Gatekeeper or ask you to remove quarantine flags. On a district-managed Mac, ask IT if policy prevents approval. Signing and notarization remain a future distribution milestone.

## Try it

Create **Test TV**, upload three images, create **Morning Announcements**, add the images (10 seconds each), and save. Assign the playlist under Screens and click **Open player**. Change and save the playlist to see updates without refreshing the player. Use your browser's full-screen option on the player window.

## Your saved data

Images and the database are saved in:

`~/Library/Application Support/OpenSign/`

In Finder, choose **Go → Go to Folder** and paste that path. Stopping or upgrading OpenSign does not delete it. Stop the app before backing up the whole folder. Restore the database and images together. Use a newly unzipped application folder when upgrading; do not mix files from versions.

## If the browser does not open

Open **http://127.0.0.1:3001** manually. If Terminal reports `EADDRINUSE`, another application or copy of OpenSign is using port 3001; stop the other OpenSign window first. Do not launch two copies against the same data folder.

## What this package does

This runs on your Mac and serves only that Mac by default. The Mac must stay awake and the application must keep running. It is not an always-on hosted staff website, an installer, or a background login service. The prototype has no staff authentication or secure device pairing; keep the default local-only binding. A network deployment still requires authentication, permissions, pairing, HTTPS, and security review.
