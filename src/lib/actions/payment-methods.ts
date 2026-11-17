"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";
import { createPaymentMethodSchema } from "@/lib/validation";
import {
  createPaymentMethod,
  renamePaymentMethod,
  setPaymentMethodHidden,
  reorderPaymentMethods,
  deletePaymentMethod,
} from "@/lib/queries/payment-methods";

export async function createPaymentMethodAction(formData: FormData) {
  const user = await requireUser();
  const raw = {
    name: String(formData.get("name") ?? ""),
  };
  const parsed = createPaymentMethodSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  try {
    await createPaymentMethod(user.id, parsed.data);
  } catch {
    // P2002 — name already used by this user.
    return { error: "Name already used" };
  }
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

export async function renamePaymentMethodAction(id: string, name: string) {
  const user = await requireUser();
  if (!name.trim()) return { error: "Name is required" };
  try {
    await renamePaymentMethod(user.id, id, name.trim());
  } catch {
    return { error: "Name already used" };
  }
  revalidatePath("/settings");
}

export async function setPaymentMethodHiddenAction(id: string, isHidden: boolean) {
  const user = await requireUser();
  await setPaymentMethodHidden(user.id, id, isHidden);
  revalidatePath("/settings");
}

export async function reorderPaymentMethodsAction(ids: string[]) {
  const user = await requireUser();
  await reorderPaymentMethods(user.id, ids);
  revalidatePath("/settings");
}

export async function deletePaymentMethodAction(id: string) {
  const user = await requireUser();
  const result = await deletePaymentMethod(user.id, id);
  revalidatePath("/settings");
  return result;
}
