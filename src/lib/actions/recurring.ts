"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/lib/queries/recurring";
import { getPaymentMethod } from "@/lib/queries/payment-methods";
import { getCategory } from "@/lib/queries/categories";
import { createTemplateSchema } from "@/lib/validation";
import { materializeDueForUser } from "@/lib/recurring";

export async function createTemplateAction(formData: FormData) {
  const user = await requireUser();
  if (!user.currencyCode) return { error: "Set a currency first" };

  const raw = {
    type: String(formData.get("type") ?? "EXPENSE"),
    amount: String(formData.get("amount") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    frequency: String(formData.get("frequency") ?? "MONTHLY"),
    startDate: String(formData.get("startDate") ?? ""),
    endDate: String(formData.get("endDate") ?? ""),
    note: String(formData.get("note") ?? ""),
    paymentMethodId: String(formData.get("paymentMethodId") ?? ""),
  };

  const parsed = createTemplateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const d = parsed.data;

  const category = await getCategory(user.id, d.categoryId);
  if (!category) return { error: "Invalid category" };
  if (category.kind !== d.type) {
    return { error: "Category does not match transaction type" };
  }

  const paymentMethod = await getPaymentMethod(user.id, d.paymentMethodId);
  if (!paymentMethod) return { error: "Invalid payment method" };

  await createTemplate(user.id, user.currencyCode!, {
    categoryId: d.categoryId,
    type: d.type,
    amount: d.amount,
    frequency: d.frequency,
    startDate: new Date(d.startDate + "T00:00:00Z"),
    endDate: d.endDate ? new Date(d.endDate + "T00:00:00Z") : null,
    note: d.note || null,
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
