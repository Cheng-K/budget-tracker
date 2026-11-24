"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

// signOut is passed in from the server layout: SignOutButton uses an inline
// "use server" action, which is illegal once imported into a Client Component.
export function AppHeader({ signOut }: { signOut: React.ReactNode }) {
  const pathname = usePathname();
  const sub = subScreen(pathname);

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900/95 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
      <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
        {sub ? (
          <div className="flex items-center gap-2">
            <Link
              href={sub.parent}
              aria-label="Back"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
            >
              <BackIcon />
            </Link>
            {sub.heading ? (
              <h1 className="whitespace-nowrap text-sm font-semibold tracking-tight">
                {sub.title}
              </h1>
            ) : (
              <span className="whitespace-nowrap text-sm font-semibold tracking-tight">
                {sub.title}
              </span>
            )}
          </div>
        ) : (
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-sm font-bold text-white">
              $
            </span>
            <span className="text-sm font-semibold tracking-tight">
              Budget Tracker
            </span>
          </Link>
        )}
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <a
            href="https://forms.gle/V1ZiLNXJffUDenLj8"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Share feedback"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <FeedbackIcon />
          </a>
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
          >
            <SettingsIcon />
          </Link>
          {signOut}
        </div>
      </div>
    </header>
  );
}

// Fixed parents, not history back: deep links and post-save redirects must
// land somewhere sensible even with no prior history. heading=false keeps
// the detail page's category-name h1 as the page's only h1.
function subScreen(pathname: string) {
  if (pathname === "/transactions/new")
    return { title: "Add transaction", parent: "/transactions", heading: true };
  const edit = pathname.match(/^\/transactions\/([^/]+)\/edit$/);
  if (edit)
    return {
      title: "Edit transaction",
      parent: `/transactions/${edit[1]}`,
      heading: true,
    };
  if (/^\/transactions\/[^/]+$/.test(pathname))
    return { title: "Transaction", parent: "/transactions", heading: false };
  if (pathname === "/settings")
    return { title: "Settings", parent: "/", heading: true };
  if (pathname === "/recurring")
    return { title: "Recurring", parent: "/", heading: true };
  return null;
}

function BackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function FeedbackIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
