import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

/**
 * The authoritative session check. `middleware.ts` is only a coarse redirect —
 * every server action and every data-loading function must call this.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }
  return session.user;
}

/** Like requireUser but returns null instead of redirecting. */
export async function getUser() {
  const session = await auth();
  return session?.user ?? null;
}
