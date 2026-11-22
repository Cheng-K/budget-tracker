"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/require-user";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/lib/validation";
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransaction,
} from "@/lib/queries/transactions";
import { getPaymentMethod } from "@/lib/queries/payment-methods";
import { getCategory } from "@/lib/queries/categories";
import { getReceipt } from "@/lib/queries/receipts";
import { toDecimal, parseUserAmount } from "@/lib/money";

function parseDate(dateStr: string): Date {
  // "YYYY-MM-DD" -> date at midnight UTC (date-only semantic).
  return new Date(dateStr + "T00:00:00Z");
}

export async function createTransactionAction(formData: FormData) {
  const user = await requireUser();
  if (!user.currencyCode) redirect("/onboarding");

  const raw = {
    type: String(formData.get("type") ?? "EXPENSE"),
    amount: String(formData.get("amount") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    date: String(formData.get("date") ?? ""),
    note: String(formData.get("note") ?? ""),
    paymentMethodId: String(formData.get("paymentMethodId") ?? ""),
    locationLabel: String(formData.get("locationLabel") ?? ""),
    lat: String(formData.get("lat") ?? ""),
    lng: String(formData.get("lng") ?? ""),
    receiptId: String(formData.get("receiptId") ?? ""),
  };

  const parsed = createTransactionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;
  const amount = parseUserAmount(d.amount);
  if (!amount) return { error: "Invalid amount" };

  const category = await getCategory(user.id, d.categoryId);
  if (!category) return { error: "Invalid category" };
  if (category.kind !== d.type) {
    return { error: "Category does not match transaction type" };
  }

  const paymentMethod = await getPaymentMethod(user.id, d.paymentMethodId);
  if (!paymentMethod) return { error: "Invalid payment method" };

  if (d.receiptId) {
    const receipt = await getReceipt(user.id, d.receiptId);
    if (!receipt) return { error: "Invalid receipt" };
    if (receipt.transactionId) {
      return { error: "Receipt already attached to a transaction" };
    }
  }

  await createTransaction(user.id, user.currencyCode!, {
    type: d.type,
    amount,
    categoryId: d.categoryId,
    date: parseDate(d.date),
    note: d.note || null,
    paymentMethodId: paymentMethod.id,
    locationLabel: d.locationLabel || null,
    lat: d.lat ? toDecimal(d.lat) : null,
    lng: d.lng ? toDecimal(d.lng) : null,
    receiptId: d.receiptId || null,
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  redirect("/transactions");
}

export async function updateTransactionAction(id: string, formData: FormData) {
  const user = await requireUser();

  const raw = {
    type: String(formData.get("type") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    date: String(formData.get("date") ?? ""),
    note: String(formData.get("note") ?? ""),
    paymentMethodId: String(formData.get("paymentMethodId") ?? ""),
    locationLabel: String(formData.get("locationLabel") ?? ""),
    lat: String(formData.get("lat") ?? ""),
    lng: String(formData.get("lng") ?? ""),
    receiptId: String(formData.get("receiptId") ?? ""),
  };

  const parsed = updateTransactionSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;
  const amount = d.amount ? parseUserAmount(d.amount) : null;
  if (d.amount && !amount) return { error: "Invalid amount" };

  if (d.paymentMethodId) {
    const paymentMethod = await getPaymentMethod(user.id, d.paymentMethodId);
    if (!paymentMethod) return { error: "Invalid payment method" };
  }

  // Changing category or type must keep both owned and kind-consistent,
  // including the field that wasn't submitted.
  if (d.categoryId || d.type) {
    const existing = await getTransaction(user.id, id);
    if (!existing) return { error: "Transaction not found" };
    const categoryId = d.categoryId ?? existing.categoryId;
    const type = d.type ?? existing.type;
    const category = await getCategory(user.id, categoryId);
    if (!category) return { error: "Invalid category" };
    if (category.kind !== type) {
      return { error: "Category does not match transaction type" };
    }
  }

  if (d.receiptId) {
    const receipt = await getReceipt(user.id, d.receiptId);
    if (!receipt) return { error: "Invalid receipt" };
    if (receipt.transactionId && receipt.transactionId !== id) {
      return { error: "Receipt already attached to a transaction" };
    }
  }

  const result = await updateTransaction(user.id, id, {
    ...(d.type && { type: d.type }),
    ...(amount && { amount }),
    ...(d.categoryId && { categoryId: d.categoryId }),
    ...(d.date && { date: parseDate(d.date) }),
    ...(d.note !== undefined && { note: d.note || null }),
    ...(d.paymentMethodId && { paymentMethodId: d.paymentMethodId }),
    ...(d.locationLabel !== undefined && { locationLabel: d.locationLabel || null }),
    ...(d.lat !== undefined && { lat: d.lat ? toDecimal(d.lat) : null }),
    ...(d.lng !== undefined && { lng: d.lng ? toDecimal(d.lng) : null }),
    ...(d.receiptId !== undefined && { receiptId: d.receiptId || null }),
  });

  if (!result) return { error: "Transaction not found" };

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath(`/transactions/${id}`);
  redirect(`/transactions/${id}`);
}

export async function deleteTransactionAction(id: string) {
  const user = await requireUser();
  await deleteTransaction(user.id, id);
  revalidatePath("/");
  revalidatePath("/transactions");
  redirect("/transactions");
}
