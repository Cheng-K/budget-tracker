import { cache } from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * The authoritative session check. `proxy.ts` is only a coarse redirect —
 * every server action and every data-loading function must call this.
 */

/** Per-request deduped session lookup (layout, page and actions share one DB round trip). */
export const getUser = cache(async () => {
  const session = await auth();
  return session?.user ?? null;
});

export async function requireUser() {
  const user = await getUser();
  if (!user?.id) {
    redirect("/login");
  }
  // Onboarding gate: no currency yet => pick one first.
  if (!user.currencyCode) {
    redirect("/onboarding");
  }
  return user;
}

/**
 * Like requireUser but without the onboarding gate — for the onboarding
 * screen itself and its actions, which must work before a currency is set.
 */
export async function requireUserNoGate() {
  const user = await getUser();
  if (!user?.id) {
    redirect("/login");
  }
  return user;
}
