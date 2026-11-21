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
    env: {
      // The dev server runs on the host, but .env's S3_ENDPOINT uses the
      // docker-network hostname (`s3`) for the containerized app. CI sets a
      // host-reachable endpoint via CI_S3_ENDPOINT — respect it if present.
      S3_ENDPOINT: process.env.S3_ENDPOINT || "http://localhost:9090",
    },
  },
});
