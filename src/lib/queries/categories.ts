import { prisma } from "@/lib/db";

export async function listCategories(userId: string, includeHidden = false) {
  return prisma.category.findMany({
    where: {
      userId,
      ...(includeHidden ? {} : { isHidden: false }),
    },
    // `kind` first keeps the combined list deterministic (EXPENSE block, then
    // INCOME) even after a per-kind reorder renumbers sortOrder to 0..n-1.
    orderBy: [{ kind: "asc" }, { sortOrder: "asc" }, { id: "asc" }],
  });
}

export async function getCategory(userId: string, id: string) {
  return prisma.category.findFirst({ where: { id, userId } });
}

export async function createCategory(
  userId: string,
  data: { name: string; kind: "EXPENSE" | "INCOME"; icon?: string }
) {
  const maxSort = await prisma.category.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  return prisma.category.create({
    data: {
      userId,
      name: data.name,
      kind: data.kind,
      icon: data.icon || null,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function renameCategory(userId: string, id: string, name: string) {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.category.update({ where: { id }, data: { name } });
}

export async function setCategoryHidden(userId: string, id: string, isHidden: boolean) {
  const existing = await prisma.category.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.category.update({ where: { id }, data: { isHidden } });
}

export async function reorderCategories(userId: string, ids: string[]) {
  // Verify all belong to the user.
  const owned = await prisma.category.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });
  if (owned.length !== ids.length) return false;

  // Callers pass one kind-group's ids at a time. After this, sortOrder is
  // unique within (userId, kind) but not globally — `listCategories` sorts by
  // kind first so combined lists stay deterministic.
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.category.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  return true;
}

export async function deleteCategory(userId: string, id: string) {
  const existing = await prisma.category.findFirst({
    where: { id, userId },
    include: {
      _count: { select: { transactions: true, recurringTemplates: true } },
    },
  });
  if (!existing) return { ok: false, reason: "not_found" as const };
  if (existing._count.transactions > 0) {
    return { ok: false, reason: "has_transactions" as const };
  }
  if (existing._count.recurringTemplates > 0) {
    return { ok: false, reason: "has_templates" as const };
  }
  await prisma.category.delete({ where: { id } });
  return { ok: true as const };
}
