import { requireUser } from "@/lib/require-user";
import { listTemplates } from "@/lib/queries/recurring";
import { listCategories } from "@/lib/queries/categories";
import { listPaymentMethods } from "@/lib/queries/payment-methods";
import { RecurringList } from "@/components/recurring-list";
import { CreateTemplateForm } from "@/components/create-template-form";

export default async function RecurringPage() {
  const user = await requireUser();
  const [templates, categories, paymentMethods] = await Promise.all([
    listTemplates(user.id),
    listCategories(user.id),
    listPaymentMethods(user.id),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-lg font-semibold tracking-tight">Recurring transactions</h1>

      <CreateTemplateForm
        categories={categories}
        paymentMethods={paymentMethods}
        currency={user.currencyCode ?? "USD"}
      />

      <RecurringList templates={templates} currency={user.currencyCode ?? "USD"} />
    </div>
  );
}
