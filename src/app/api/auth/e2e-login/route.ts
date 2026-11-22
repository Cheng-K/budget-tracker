import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { seedUserDefaults } from "@/lib/seed-user";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Test-only login: mints a real database session (Session row + the
 * `authjs.session-token` cookie Auth.js looks up) so Playwright can exercise
 * the authenticated UI without the OAuth handshake.
 *
 * Dead unless E2E_AUTH_ENABLED=1, and impossible to enable in a production
 * build (npm start sets NODE_ENV=production). Real sign-in is unaffected.
 */
export async function GET(request: NextRequest) {
  if (process.env.E2E_AUTH_ENABLED !== "1" || process.env.NODE_ENV === "production") {
    return new Response(
      "e2e-login disabled: set E2E_AUTH_ENABLED=1 in .env and run `npm run dev` (not `npm start`).",
      { status: 404 },
    );
  }

  const sp = request.nextUrl.searchParams;
  const email = sp.get("email") ?? "e2e@example.test";
  const currency = sp.get("currency") ?? "USD";
  const onboarding = sp.get("onboarding") === "1";
  const redirectTo = sp.get("redirect") ?? "/";
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      currencyCode: onboarding ? null : currency,
      timezone: "UTC",
    },
  });
  await seedUserDefaults(user.id);

  const sessionToken = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + THIRTY_DAYS_MS);
  await prisma.session.create({
    data: { sessionToken, userId: user.id, expires },
  });

  (await cookies()).set("authjs.session-token", sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: false,
    expires,
  });

  return NextResponse.redirect(new URL(safeRedirect, request.nextUrl.origin));
}
