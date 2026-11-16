"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";
import { setBudgetSchema } from "@/lib/validation";
import {
  setBudget,
  clearBudget,
  copyLastMonthBudgets,
} from "@/lib/queries/budgets";

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

  const monthDate = new Date(parsed.data.month + "T00:00:00Z");
  await setBudget(user.id, parsed.data.categoryId, monthDate, parsed.data.limitAmount);

  revalidatePath("/budgets");
  revalidatePath("/");
}

export async function clearBudgetAction(categoryId: string, month: string) {
  const user = await requireUser();
  const monthDate = new Date(month + "T00:00:00Z");
  await clearBudget(user.id, categoryId, monthDate);
  revalidatePath("/budgets");
  revalidatePath("/");
}

export async function copyLastMonthBudgetsAction(month: string) {
  const user = await requireUser();
  const monthDate = new Date(month + "T00:00:00Z");
  await copyLastMonthBudgets(user.id, monthDate);
  revalidatePath("/budgets");
  revalidatePath("/");
}
