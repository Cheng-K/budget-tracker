import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  webServer: {
    // `npm run dev` (not `npm start`): the e2e-login auth bypass is disabled
    // when NODE_ENV=production, so tests must run against the dev server.
    // An already-running dev server on :3000 is reused.
    command: "npm run dev",
    port: 3000,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
