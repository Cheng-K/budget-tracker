import type { Page } from "@playwright/test";

interface LoginOptions {
  /** Distinct email per call keeps each test's user (and its data) isolated. */
  email?: string;
  currency?: string;
  /** Create the user without a currency so the /onboarding gate kicks in. */
  onboarding?: boolean;
  redirectTo?: string;
}

/**
 * Signs in through the test-only /api/auth/e2e-login endpoint, which mints a
 * real database session (Session row + the authjs.session-token cookie).
 * Returns the email of the logged-in user.
 */
export async function login(page: Page, opts: LoginOptions = {}): Promise<string> {
  const email =
    opts.email ??
    `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;

  const params = new URLSearchParams({ email });
  if (opts.currency) params.set("currency", opts.currency);
  if (opts.onboarding) params.set("onboarding", "1");
  if (opts.redirectTo) params.set("redirect", opts.redirectTo);

  const response = await page.goto(`/api/auth/e2e-login?${params.toString()}`);
  if (response?.status() === 404) {
    throw new Error(`e2e-login returned 404: ${await response.text()}`);
  }

  const cookies = await page.context().cookies();
  if (!cookies.some((c) => c.name === "authjs.session-token")) {
    throw new Error("e2e-login did not set the authjs.session-token cookie");
  }

  return email;
}
