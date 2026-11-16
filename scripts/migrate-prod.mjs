/**
 * Run `prisma migrate deploy` only for Vercel production builds.
 *
 * Preview builds skip this so they never touch the production schema, and
 * local/Docker builds skip it too — Docker migrates at container start
 * (see Dockerfile CMD) and local dev runs `npm run db:migrate`.
 */
import { spawnSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log(
    `[migrate-prod] skipping migrations (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"})`
  );
  process.exit(0);
}

console.log("[migrate-prod] VERCEL_ENV=production — running prisma migrate deploy");
const result = spawnSync("npx prisma migrate deploy", {
  stdio: "inherit",
  shell: true,
});
process.exit(result.status ?? 1);
