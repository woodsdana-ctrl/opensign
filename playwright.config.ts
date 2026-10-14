import { randomUUID } from "node:crypto";
import { defineConfig } from "@playwright/test";
const port = Number(process.env.TEST_PORT ?? 3001);
const baseURL = `http://127.0.0.1:${port}`;
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: { baseURL, headless: true },
  webServer: {
    command: process.env.PLAYWRIGHT_SERVER_EXECUTABLE
      ? `"${process.env.PLAYWRIGHT_SERVER_EXECUTABLE}"`
      : "npm start",
    env: {
      PORT: String(port),
      DATA_DIR: `/tmp/opensign-browser-${randomUUID()}`,
      OPENSIGN_OPEN_BROWSER: "0",
    },
    url: `${baseURL}/api/state`,
    reuseExistingServer: false,
  },
  timeout: 60000,
});
