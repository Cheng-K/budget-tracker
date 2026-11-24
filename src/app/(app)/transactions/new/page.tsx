import { requireUser } from "@/lib/require-user";
import { listCategories } from "@/lib/queries/categories";
import { listPaymentMethods } from "@/lib/queries/payment-methods";
import { TransactionForm } from "@/components/transaction-form";

export default async function NewTransactionPage() {
  const user = await requireUser();
  const [categories, paymentMethods] = await Promise.all([
    listCategories(user.id),
    listPaymentMethods(user.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <TransactionForm
        categories={categories}
        paymentMethods={paymentMethods}
        defaultCurrency={user.currencyCode ?? "USD"}
      />
    </div>
  );
}
