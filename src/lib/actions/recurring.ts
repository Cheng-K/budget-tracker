"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/queries/recurring";
import { getPaymentMethod } from "@/lib/queries/payment-methods";
import { materializeDueForUser } from "@/lib/recurring";

export async function createTemplateAction(formData: FormData) {
  const user = await requireUser();
  if (!user.currencyCode) return { error: "Set a currency first" };

  const data = {
    categoryId: String(formData.get("categoryId") ?? ""),
    type: String(formData.get("type") ?? "EXPENSE") as "EXPENSE" | "INCOME",
    amount: String(formData.get("amount") ?? ""),
    frequency: String(formData.get("frequency") ?? "MONTHLY") as "WEEKLY" | "MONTHLY" | "YEARLY",
    startDate: new Date(String(formData.get("startDate") ?? "") + "T00:00:00Z"),
    endDate: formData.get("endDate")
      ? new Date(String(formData.get("endDate")) + "T00:00:00Z")
      : null,
    note: String(formData.get("note") ?? ""),
    paymentMethodId: String(formData.get("paymentMethodId") ?? ""),
  };

  if (!data.categoryId || !data.amount || isNaN(data.startDate.getTime())) {
    return { error: "Category, amount, and start date are required" };
  }
  if (!data.paymentMethodId) {
    return { error: "Payment method is required" };
  }

  const paymentMethod = await getPaymentMethod(user.id, data.paymentMethodId);
  if (!paymentMethod) return { error: "Invalid payment method" };

  await createTemplate(user.id, user.currencyCode!, {
    ...data,
    paymentMethodId: paymentMethod.id,
  });
  revalidatePath("/recurring");
  revalidatePath("/");
}

export async function toggleTemplateAction(id: string, isActive: boolean) {
  const user = await requireUser();
  await updateTemplate(user.id, id, { isActive });
  revalidatePath("/recurring");
}

export async function deleteTemplateAction(id: string) {
  const user = await requireUser();
  await deleteTemplate(user.id, id);
  revalidatePath("/recurring");
  revalidatePath("/");
}

export async function materializeNowAction() {
  const user = await requireUser();
  const today = new Date(
    new Date().toLocaleDateString("en-CA", { timeZone: user.timezone })
  );
  await materializeDueForUser(user.id, today);
  revalidatePath("/recurring");
  revalidatePath("/transactions");
  revalidatePath("/");
}
