import { execFile } from "node:child_process";
import { createApp } from "./app.js";
const { app, db } = createApp(process.env.DATA_DIR ?? "data");
const port = Number(process.env.PORT ?? 3001);
const server = app.listen(port, process.env.HOST ?? "127.0.0.1", () => {
  const url = `http://127.0.0.1:${port}`;
  console.log(`OpenSign is running: ${url}`);
  console.log("Keep this window open. Press Ctrl+C to stop OpenSign.");
  if (process.env.OPENSIGN_OPEN_BROWSER === "1") {
    const command =
      process.platform === "win32"
        ? "explorer.exe"
        : process.platform === "darwin"
          ? "open"
          : "xdg-open";
    execFile(command, [url], (error) => {
      if (error) console.log(`Open your browser and visit ${url}`);
    });
  }
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
