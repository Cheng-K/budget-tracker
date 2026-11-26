import { AppHeader } from "@/components/app-header";
import { BottomNav } from "@/components/bottom-nav";
import { SignOutButton } from "@/components/sign-out-button";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-neutral-50 dark:bg-neutral-950">
      <AppHeader signOut={<SignOutButton />} />

      <main className="mx-auto max-w-lg px-4 pb-32 pt-6">{children}</main>

      <BottomNav />
    </div>
  );
}
