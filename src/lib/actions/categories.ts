"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/require-user";
import { createCategorySchema } from "@/lib/validation";
import {
  createCategory,
  renameCategory,
  setCategoryHidden,
  reorderCategories,
  deleteCategory,
} from "@/lib/queries/categories";

export async function createCategoryAction(formData: FormData) {
  const user = await requireUser();
  const raw = {
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? "EXPENSE"),
    icon: String(formData.get("icon") ?? ""),
  };
  const parsed = createCategorySchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  await createCategory(user.id, parsed.data);
  revalidatePath("/settings");
  revalidatePath("/transactions");
}

export async function renameCategoryAction(id: string, name: string) {
  const user = await requireUser();
  if (!name.trim()) return { error: "Name is required" };
  await renameCategory(user.id, id, name.trim());
  revalidatePath("/settings");
}

export async function setCategoryHiddenAction(id: string, isHidden: boolean) {
  const user = await requireUser();
  await setCategoryHidden(user.id, id, isHidden);
  revalidatePath("/settings");
}

export async function reorderCategoriesAction(ids: string[]) {
  const user = await requireUser();
  await reorderCategories(user.id, ids);
  revalidatePath("/settings");
}

export async function deleteCategoryAction(id: string) {
  const user = await requireUser();
  const result = await deleteCategory(user.id, id);
  revalidatePath("/settings");
  return result;
}
