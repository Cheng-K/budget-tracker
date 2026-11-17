import { notFound } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import { getTransaction } from "@/lib/queries/transactions";
import { listCategories } from "@/lib/queries/categories";
import { listPaymentMethods } from "@/lib/queries/payment-methods";
import { TransactionForm } from "@/components/transaction-form";

export default async function EditTransactionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {

  const [user, { id }] = await Promise.all([requireUser(), params]);
  const [transaction, categories, paymentMethods] = await Promise.all([
    getTransaction(user.id, id),
    listCategories(user.id, true),
    listPaymentMethods(user.id, true),
  ]);
  if (!transaction) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold tracking-tight">Edit transaction</h1>
      <TransactionForm
        categories={categories}
        paymentMethods={paymentMethods}
        defaultCurrency={user.currencyCode ?? "USD"}
        transaction={transaction}
      />
    </div>
  );
}
