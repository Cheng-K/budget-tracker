import { request, type FullConfig } from "@playwright/test";

/**
 * Warm the dev server's on-demand Turbopack compilation before tests run.
 * Without this, the first navigation to each route races a cold compile and
 * can exceed the expect timeout under parallel workers (especially on CI).
 */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use?.baseURL ?? "http://localhost:3000";
  const ctx = await request.newContext({ baseURL, timeout: 60_000 });

  // Mint a real session through the dev-only e2e-login endpoint.
  await ctx.get("/api/auth/e2e-login?email=warmup@example.test");

  for (const path of [
    "/",
    "/transactions",
    "/transactions/new",
    "/budgets",
    "/recurring",
    "/reports",
    "/settings",
    "/login",
  ]) {
    await ctx.get(path);
  }

  await ctx.dispose();
}
