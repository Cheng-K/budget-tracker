import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { CURRENCIES } from "@/lib/currencies";
import { redirect } from "next/navigation";

async function setCurrency(formData: FormData) {
  "use server";
  const user = await requireUser();
  const code = String(formData.get("currencyCode") ?? "");
  if (!CURRENCIES.some((c) => c.code === code)) {
    throw new Error("Invalid currency");
  }
  await prisma.user.update({
    where: { id: user.id },
    data: { currencyCode: code },
  });
  redirect("/");
}

export default async function OnboardingPage() {
  await requireUser();

  return (
    <main className="flex min-h-dvh flex-col items-center gap-8 px-6 py-12">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Choose your currency
        </h1>
        <p className="max-w-sm text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">
          This sets how amounts are displayed across the app. You can change it
          later in Settings until you add your first transaction.
        </p>
      </div>

      <form action={setCurrency} className="w-full max-w-md">
        <ul className="grid grid-cols-2 gap-2">
          {CURRENCIES.map((c) => (
            <li key={c.code}>
              <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900 px-3 py-3 transition hover:border-emerald-500 hover:bg-emerald-50 has-[:checked]:border-emerald-600 has-[:checked]:bg-emerald-50 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:bg-neutral-700 dark:has-[:checked]:bg-neutral-700">
                <input
                  type="radio"
                  name="currencyCode"
                  value={c.code}
                  required
                  className="sr-only"
                />
                <span className="w-8 text-center text-lg">{c.symbol}</span>
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{c.code}</span>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{c.name}</span>
                </span>
              </label>
            </li>
          ))}
        </ul>

        <button
          type="submit"
          className="mt-6 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-emerald-700 active:scale-[0.99]"
        >
          Continue
        </button>
      </form>
    </main>
  );
}
