import { NextRequest, NextResponse } from "next/server";

/**
 * Coarse auth redirect only — checks for the presence of a session cookie.
 *
 * This runs on the Edge runtime where Prisma is unavailable, so we must NOT
 * call `auth()` here (it would query the database via the Prisma adapter).
 * The authoritative check is `requireUser()` in every server action and
 * data-loading function on the Node side.
 */
export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname === "/api/health" ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/manifest") ||
    pathname.startsWith("/icons") ||
    pathname === "/sw.js";

  if (isPublic) return NextResponse.next();

  // Auth.js sets one of these cookies depending on whether the site is
  // served over HTTPS or HTTP.
  const sessionCookie =
    req.cookies.get("authjs.session-token") ??
    req.cookies.get("__Secure-authjs.session-token");

  if (!sessionCookie?.value) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static assets, images, and the service worker.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|sw.js|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico|js|css)$).*)"],
};
