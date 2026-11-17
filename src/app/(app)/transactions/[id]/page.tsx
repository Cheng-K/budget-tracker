import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { requireUser } from "@/lib/require-user";
import { getTransaction } from "@/lib/queries/transactions";
import { formatMoney } from "@/lib/money";
import { DeleteTransactionButton } from "@/components/delete-transaction-button";
import { LocationMap } from "@/components/location-map";

export default async function TransactionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [user, { id }] = await Promise.all([requireUser(), params]);
  const t = await getTransaction(user.id, id);
  if (!t) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold tracking-tight">{t.category.name}</h1>
        <span
          className={`text-xl font-bold ${
            t.type === "INCOME" ? "text-emerald-600" : "text-red-600"
          }`}
        >
          {t.type === "INCOME" ? "+" : "−"}
          {formatMoney(t.amount, t.currencyCode)}
        </span>
      </div>

      <dl className="divide-y divide-neutral-100 dark:divide-neutral-800 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:border-neutral-800 dark:bg-neutral-900">
        <DetailRow label="Type" value={t.type === "INCOME" ? "Income" : "Expense"} />
        <DetailRow
          label="Date"
          value={format(t.date, "EEEE, MMMM d, yyyy")}
        />
        <DetailRow label="Payment" value={t.paymentMethod.name} />
        {t.note && <DetailRow label="Note" value={t.note} />}
        {t.locationLabel && <DetailRow label="Location" value={t.locationLabel} />}
      </dl>

      {t.receipt && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Receipt</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/receipts/${t.receipt.id}`}
            alt="Receipt"
            className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 object-cover"
          />
        </div>
      )}

      {t.lat && t.lng && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-neutral-700 dark:text-neutral-300">Map</h2>
          <LocationMap
            lat={parseFloat(String(t.lat))}
            lng={parseFloat(String(t.lng))}
            label={t.locationLabel || t.category.name}
          />
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href={`/transactions/${t.id}/edit`}
          className="flex-1 rounded-xl border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-center text-sm font-medium text-neutral-700 dark:text-neutral-300 transition hover:bg-neutral-50 dark:bg-neutral-950 dark:hover:bg-neutral-800"
        >
          Edit
        </Link>
        <DeleteTransactionButton id={t.id} />
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">{label}</dt>
      <dd className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{value}</dd>
    </div>
  );
}
