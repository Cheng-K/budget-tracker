import { prisma } from "@/lib/db";

export async function listPaymentMethods(userId: string, includeHidden = false) {
  return prisma.paymentMethod.findMany({
    where: {
      userId,
      ...(includeHidden ? {} : { isHidden: false }),
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}

export async function getPaymentMethod(userId: string, id: string) {
  return prisma.paymentMethod.findFirst({ where: { id, userId } });
}

export async function createPaymentMethod(userId: string, data: { name: string }) {
  const maxSort = await prisma.paymentMethod.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  return prisma.paymentMethod.create({
    data: {
      userId,
      name: data.name,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });
}

export async function renamePaymentMethod(userId: string, id: string, name: string) {
  const existing = await prisma.paymentMethod.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.paymentMethod.update({ where: { id }, data: { name } });
}

export async function setPaymentMethodHidden(userId: string, id: string, isHidden: boolean) {
  const existing = await prisma.paymentMethod.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.paymentMethod.update({ where: { id }, data: { isHidden } });
}

export async function reorderPaymentMethods(userId: string, ids: string[]) {
  // Verify all belong to the user.
  const owned = await prisma.paymentMethod.findMany({
    where: { userId, id: { in: ids } },
    select: { id: true },
  });
  if (owned.length !== ids.length) return false;

  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.paymentMethod.update({ where: { id }, data: { sortOrder: index } })
    )
  );
  return true;
}

export async function deletePaymentMethod(userId: string, id: string) {
  const existing = await prisma.paymentMethod.findFirst({
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
  await prisma.paymentMethod.delete({ where: { id } });
  return { ok: true as const };
}
