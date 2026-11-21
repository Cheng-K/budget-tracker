import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  // Cold dev-server compiles can make the first navigations slow; the
  // globalSetup warm-up handles most of it, these are the safety margin.
  timeout: 60_000,
  expect: { timeout: 15_000 },
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTimeout: 180_000,
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
      // The webServer runs on the host, where the docker-network hostname
      // (`s3`, used by .env for the containerized app) is unresolvable.
      // CI supplies a host-reachable endpoint via CI_S3_ENDPOINT; a local
      // shell may export the docker hostname — rewrite it to localhost.
      S3_ENDPOINT: (process.env.S3_ENDPOINT || "http://localhost:9090").replace(
        /^(https?:\/\/)s3(:|\/)/,
        "$1localhost$2"
      ),
    },
  },
});
