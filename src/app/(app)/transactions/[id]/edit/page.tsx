import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { getTransaction } from "@/lib/queries/transactions";
import { listCategories } from "@/lib/queries/categories";
import { TransactionForm } from "@/components/transaction-form";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const [transaction, categories] = await Promise.all([
    getTransaction(user.id, id),
    listCategories(user.id),
  ]);
  if (!transaction) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight">Edit transaction</h1>
      <TransactionForm
        categories={categories}
        defaultCurrency={user.currencyCode ?? "USD"}
        transaction={transaction}
      />
    </div>
  );
}
