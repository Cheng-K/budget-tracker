import { prisma } from "@/lib/db";
import type { RecurringFrequency, TransactionType } from "@prisma/client";

export async function listTemplates(userId: string) {
  const [templates, lastRows] = await Promise.all([
    prisma.recurringTemplate.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { startDate: "asc" },
    }),
    // Latest occurrence per template. Nested `take: 1` would make Prisma
    // fetch every occurrence in memory, so aggregate in SQL instead.
    prisma.$queryRaw<{ templateId: string; occurrenceDate: Date; transactionId: string | null }[]>`
      SELECT DISTINCT ON (o."templateId") o."templateId", o."occurrenceDate", o."transactionId"
      FROM "RecurringOccurrence" o
      JOIN "RecurringTemplate" t ON t."id" = o."templateId"
      WHERE t."userId" = ${userId}
      ORDER BY o."templateId", o."occurrenceDate" DESC
    `,
  ]);

  const occMap = new Map(lastRows.map((o) => [o.templateId, o]));
  return templates.map((t) => {
    const occ = occMap.get(t.id);
    return {
      ...t,
      lastOccurrence: occ
        ? { occurrenceDate: occ.occurrenceDate, transactionId: occ.transactionId }
        : null,
    };
  });
}

export async function getTemplate(userId: string, id: string) {
  return prisma.recurringTemplate.findFirst({
    where: { id, userId },
    include: { category: true, paymentMethod: true },
  });
}

export async function createTemplate(
  userId: string,
  currencyCode: string,
  data: {
    categoryId: string;
    type: TransactionType;
    amount: string;
    frequency: RecurringFrequency;
    startDate: Date;
    endDate?: Date | null;
    note?: string | null;
    paymentMethodId: string;
  }
) {
  return prisma.recurringTemplate.create({
    data: {
      userId,
      currencyCode,
      categoryId: data.categoryId,
      type: data.type,
      amount: data.amount,
      frequency: data.frequency,
      startDate: data.startDate,
      endDate: data.endDate ?? null,
      note: data.note || null,
      paymentMethodId: data.paymentMethodId,
    },
    include: { category: true, paymentMethod: true },
  });
}

export async function updateTemplate(
  userId: string,
  id: string,
  data: Partial<{
    categoryId: string;
    type: TransactionType;
    amount: string;
    frequency: RecurringFrequency;
    startDate: Date;
    endDate: Date | null;
    note: string | null;
    paymentMethodId: string;
    isActive: boolean;
  }>
) {
  const existing = await prisma.recurringTemplate.findFirst({ where: { id, userId } });
  if (!existing) return null;
  return prisma.recurringTemplate.update({
    where: { id },
    data,
    include: { category: true, paymentMethod: true },
  });
}

export async function deleteTemplate(userId: string, id: string) {
  const existing = await prisma.recurringTemplate.findFirst({ where: { id, userId } });
  if (!existing) return false;
  await prisma.recurringTemplate.delete({ where: { id } });
  return true;
}
