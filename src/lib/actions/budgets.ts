"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";
import { setBudgetSchema, monthStringSchema } from "@/lib/validation";
import {
  setBudget,
  clearBudget,
  copyLastMonthBudgets,
} from "@/lib/queries/budgets";
import { getCategory } from "@/lib/queries/categories";

// "YYYY-MM" or "YYYY-MM-01" -> 1st of month at midnight UTC, null if invalid.
function parseMonth(month: string): Date | null {
  const parsed = monthStringSchema.safeParse(month);
  if (!parsed.success) return null;
  const first = parsed.data.length === 7 ? parsed.data + "-01" : parsed.data;
  return new Date(first + "T00:00:00Z");
}

export async function setBudgetAction(formData: FormData) {
  const user = await requireUser();
  const raw = {
    categoryId: String(formData.get("categoryId") ?? ""),
    month: String(formData.get("month") ?? ""),
    limitAmount: String(formData.get("limitAmount") ?? ""),
  };

  const parsed = setBudgetSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const category = await getCategory(user.id, parsed.data.categoryId);
  if (!category) return { error: "Invalid category" };

  const monthDate = parseMonth(parsed.data.month)!;
  await setBudget(user.id, parsed.data.categoryId, monthDate, parsed.data.limitAmount);

  revalidatePath("/budgets");
  revalidatePath("/");
}

export async function clearBudgetAction(categoryId: string, month: string) {
  const user = await requireUser();
  const monthDate = parseMonth(month);
  if (!monthDate) return { error: "Invalid month" };
  await clearBudget(user.id, categoryId, monthDate);
  revalidatePath("/budgets");
  revalidatePath("/");
}

export async function copyLastMonthBudgetsAction(month: string) {
  const user = await requireUser();
  const monthDate = parseMonth(month);
  if (!monthDate) return { error: "Invalid month" };
  await copyLastMonthBudgets(user.id, monthDate);
  revalidatePath("/budgets");
  revalidatePath("/");
}
