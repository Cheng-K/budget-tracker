import { prisma } from "@/lib/db";
import type { RecurringFrequency, TransactionType } from "@prisma/client";

export async function listTemplates(userId: string) {
  return prisma.recurringTemplate.findMany({
    where: { userId },
    include: {
      category: true,
      paymentMethod: true,
      occurrences: {
        orderBy: { occurrenceDate: "desc" },
        take: 1,
        include: { transaction: true },
      },
    },
    orderBy: { startDate: "asc" },
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
