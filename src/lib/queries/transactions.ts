import { prisma } from "@/lib/db";
import type { Prisma, Transaction } from "@prisma/client";
import type { TransactionFilterInput } from "@/lib/validation";

export async function listTransactions(
  userId: string,
  filter: TransactionFilterInput
) {
  const where: Prisma.TransactionWhereInput = { userId };

  if (filter.type) where.type = filter.type;
  if (filter.categoryId) where.categoryId = filter.categoryId;

  if (filter.dateFrom || filter.dateTo) {
    where.date = {};
    if (filter.dateFrom) where.date.gte = new Date(filter.dateFrom);
    if (filter.dateTo) where.date.lte = new Date(filter.dateTo);
  }

  if (filter.amountMin || filter.amountMax) {
    where.amount = {};
    if (filter.amountMin) where.amount.gte = filter.amountMin;
    if (filter.amountMax) where.amount.lte = filter.amountMax;
  }

  if (filter.q) {
    where.note = { contains: filter.q, mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: { category: true, receipt: true, paymentMethod: true },
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: filter.limit,
      ...(filter.cursor ? { cursor: { id: filter.cursor }, skip: 1 } : {}),
    }),
    prisma.transaction.count({ where }),
  ]);

  return { items, total, nextCursor: items.length === filter.limit ? items[items.length - 1]?.id : null };
}

export async function getTransaction(userId: string, id: string) {
  return prisma.transaction.findFirst({
    where: { id, userId },
    include: { category: true, receipt: true, paymentMethod: true },
  });
}

export async function createTransaction(
  userId: string,
  currencyCode: string,
  data: {
    type: "EXPENSE" | "INCOME";
    amount: Prisma.Decimal | string;
    categoryId: string;
    date: Date;
    note?: string | null;
    paymentMethodId: string;
    locationLabel?: string | null;
    lat?: Prisma.Decimal | null;
    lng?: Prisma.Decimal | null;
    receiptId?: string | null;
    recurringTemplateId?: string | null;
    occurrenceDate?: Date | null;
  }
) {
  return prisma.transaction.create({
    data: {
      userId,
      currencyCode,
      type: data.type,
      amount: data.amount as Prisma.Decimal,
      categoryId: data.categoryId,
      date: data.date,
      note: data.note || null,
      paymentMethodId: data.paymentMethodId,
      locationLabel: data.locationLabel || null,
      lat: (data.lat ?? null) as Prisma.Decimal | null,
      lng: (data.lng ?? null) as Prisma.Decimal | null,
      recurringTemplateId: data.recurringTemplateId || null,
      occurrenceDate: data.occurrenceDate ?? null,
    },
    include: { category: true, paymentMethod: true },
  });
}

export async function updateTransaction(
  userId: string,
  id: string,
  data: {
    type?: "EXPENSE" | "INCOME";
    amount?: Prisma.Decimal | string;
    categoryId?: string;
    date?: Date;
    note?: string | null;
    paymentMethodId?: string;
    locationLabel?: string | null;
    lat?: Prisma.Decimal | null;
    lng?: Prisma.Decimal | null;
    receiptId?: string | null;
  }
) {
  // Verify ownership first.
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) return null;

  return prisma.transaction.update({
    where: { id },
    data: {
      ...(data.type && { type: data.type }),
      ...(data.amount !== undefined && { amount: data.amount as Prisma.Decimal }),
      ...(data.categoryId && { categoryId: data.categoryId }),
      ...(data.date && { date: data.date }),
      ...(data.note !== undefined && { note: data.note || null }),
      ...(data.paymentMethodId && { paymentMethodId: data.paymentMethodId }),
      ...(data.locationLabel !== undefined && { locationLabel: data.locationLabel || null }),
      ...(data.lat !== undefined && { lat: data.lat as Prisma.Decimal | null }),
      ...(data.lng !== undefined && { lng: data.lng as Prisma.Decimal | null }),
    },
    include: { category: true, paymentMethod: true },
  });
}

export async function deleteTransaction(userId: string, id: string) {
  const existing = await prisma.transaction.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.transaction.delete({ where: { id } });
  return true;
}
