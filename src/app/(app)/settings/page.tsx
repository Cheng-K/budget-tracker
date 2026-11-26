import { requireUser } from "@/lib/require-user";
import { listCategories } from "@/lib/queries/categories";
import { listPaymentMethods } from "@/lib/queries/payment-methods";
import { findCurrency } from "@/lib/currencies";
import { CategoryManager } from "@/components/category-manager";
import { PaymentMethodManager } from "@/components/payment-method-manager";

export default async function SettingsPage() {
  const user = await requireUser();
  const [categories, paymentMethods] = await Promise.all([
    listCategories(user.id, true),
    listPaymentMethods(user.id, true),
  ]);
  const currency = findCurrency(user.currencyCode ?? "USD");

  return (
    <div className="flex flex-col gap-8">
      {/* Profile */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Profile</h2>
        <dl className="mt-3 divide-y divide-neutral-100 dark:divide-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Email</dt>
            <dd className="text-sm font-medium">{user.email}</dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Currency</dt>
            <dd className="text-sm font-medium">
              {currency ? `${currency.symbol} ${currency.code}` : user.currencyCode}
            </dd>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <dt className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Timezone</dt>
            <dd className="text-sm font-medium">{user.timezone}</dd>
          </div>
        </dl>
      </section>

      {/* Categories */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Categories</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Rename, hide, delete, or drag to reorder categories. Categories with
          transactions can be hidden but not deleted.
        </p>
        <CategoryManager categories={categories} />
      </section>

      {/* Payment methods */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Payment methods</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Rename, hide, delete, or drag to reorder payment methods. Methods with
          transactions or recurring templates can be hidden but not deleted.
        </p>
        <PaymentMethodManager paymentMethods={paymentMethods} />
      </section>

      {/* Feedback */}
      <section>
        <h2 className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Feedback</h2>
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
          Help us improve Budget Tracker. Tell us what&apos;s working, what&apos;s
          confusing, and what&apos;s missing.
        </p>
        <a
          href="https://forms.gle/V1ZiLNXJffUDenLj8"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:bg-neutral-800"
        >
          Share feedback
          <ExternalLinkIcon />
        </a>
      </section>
    </div>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
  );
}
