import { randomUUID } from "node:crypto";
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:3001", headless: true },
  webServer: {
    command: `DATA_DIR=/tmp/opensign-browser-${randomUUID()} npm start`,
    url: "http://127.0.0.1:3001/api/state",
    reuseExistingServer: false,
  },
  timeout: 60000,
});
