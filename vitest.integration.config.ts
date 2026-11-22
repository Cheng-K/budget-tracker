import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "path";

// Integration tests run against the real Postgres from `npm run infra`.
// `npm run test` (unit) stays infra-free; this suite is separate on purpose.
const env = loadEnv("test", process.cwd(), "");
const databaseUrl = process.env.DATABASE_URL || env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env, then run `npm run infra && npm run db:migrate`."
  );
}

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    include: ["tests/integration/**/*.integration.test.ts"],
    environment: "node",
    setupFiles: ["tests/integration/setup.ts"],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    env: {
      DATABASE_URL: databaseUrl,
    },
  },
});
