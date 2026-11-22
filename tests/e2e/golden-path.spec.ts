import { test, expect } from "@playwright/test";

/**
 * Golden-path E2E tests for the unauthenticated surface.
 *
 * Playwright starts `npm run dev`, which provisions docker (postgres + s3)
 * and runs migrations. Authenticated flows live in authenticated.spec.ts —
 * they sign in through the test-only /api/auth/e2e-login endpoint (a real
 * database session, so no OAuth credentials are needed).
 */

test.describe("Budget Tracker golden path", () => {
  test("health endpoint returns ok", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe("ok");
  });

  test("login page renders", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("text=Budget Tracker")).toBeVisible();
    await expect(page.locator("text=Continue with Google")).toBeVisible();
    await expect(page.locator("text=Continue with GitHub")).toBeVisible();
  });

  test("unauthenticated user is redirected to login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("PWA manifest is served", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest");
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.name).toBe("Budget Tracker");
    expect(body.display).toBe("standalone");
  });

  test("service worker is served", async ({ request }) => {
    const res = await request.get("/sw.js");
    expect(res.ok()).toBeTruthy();
  });
});
