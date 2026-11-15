import { requireUser } from "@/lib/require-user";
import { listCategories } from "@/lib/queries/categories";
import { findCurrency } from "@/lib/currencies";
import { CategoryManager } from "@/components/category-manager";

export default async function SettingsPage() {
  const user = await requireUser();
  const categories = await listCategories(user.id, true);
  const currency = findCurrency(user.currencyCode ?? "USD");

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-lg font-semibold tracking-tight">Settings</h1>

      {/* Profile */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700">Profile</h2>
        <dl className="mt-3 divide-y divide-neutral-100 rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-neutral-500">Email</dt>
            <dd className="text-sm font-medium">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-neutral-500">Currency</dt>
            <dd className="text-sm font-medium">
              {currency ? `${currency.symbol} ${currency.code}` : user.currencyCode}
            </dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-neutral-500">Timezone</dt>
            <dd className="text-sm font-medium">{user.timezone}</dd>
          </div>
        </dl>
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700">Categories</h2>
        <p className="mt-1 text-xs text-neutral-500">
          Rename, hide, or delete categories you don&apos;t use. Categories with
          transactions can be hidden but not deleted.
        </p>
        <CategoryManager categories={categories} />
      </section>
    </div>
  );
}
