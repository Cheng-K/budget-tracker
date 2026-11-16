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
} from "@/lib/queries/transactions";
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
    paymentMethod: String(formData.get("paymentMethod") ?? "OTHER"),
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

  await createTransaction(user.id, user.currencyCode!, {
    type: d.type,
    amount,
    categoryId: d.categoryId,
    date: parseDate(d.date),
    note: d.note || null,
    paymentMethod: d.paymentMethod,
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
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
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

  const result = await updateTransaction(user.id, id, {
    ...(d.type && { type: d.type }),
    ...(amount && { amount }),
    ...(d.categoryId && { categoryId: d.categoryId }),
    ...(d.date && { date: parseDate(d.date) }),
    ...(d.note !== undefined && { note: d.note || null }),
    ...(d.paymentMethod && { paymentMethod: d.paymentMethod }),
    ...(d.locationLabel !== undefined && { locationLabel: d.locationLabel || null }),
    ...(d.lat !== undefined && { lat: d.lat ? toDecimal(d.lat) : null }),
    ...(d.lng !== undefined && { lng: d.lng ? toDecimal(d.lng) : null }),
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
