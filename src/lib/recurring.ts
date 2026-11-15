import Decimal from "decimal.js";
import { prisma } from "@/lib/db";
import type { RecurringFrequency, TransactionType, PaymentMethod } from "@prisma/client";

/**
 * Compute the k-th occurrence date from a start date + frequency.
 * Uses startDate + k*interval (never `lastRun + interval`) to avoid drift.
 * Month-end clamping: Jan 31 monthly → Feb 28.
 */
export function computeOccurrenceDate(
  startDate: Date,
  frequency: RecurringFrequency,
  k: number
): Date {
  const d = new Date(startDate.getTime());
  if (frequency === "WEEKLY") {
    d.setUTCDate(d.getUTCDate() + k * 7);
    return d;
  }
  if (frequency === "MONTHLY") {
    const month = d.getUTCMonth() + k;
    const year = d.getUTCFullYear() + Math.floor(month / 12);
    const m = ((month % 12) + 12) % 12;
    // Get the last day of the target month for clamping.
    const lastDay = new Date(Date.UTC(year, m + 1, 0)).getUTCDate();
    const day = Math.min(d.getUTCDate(), lastDay);
    return new Date(Date.UTC(year, m, day));
  }
  // YEARLY
  const year = d.getUTCFullYear() + k;
  const month = d.getUTCMonth();
  // Clamp Feb 29 on non-leap years.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(d.getUTCDate(), lastDay);
  return new Date(Date.UTC(year, month, day));
}

/**
 * Find the next occurrence date for a template after a given date.
 * Returns null if the template has ended.
 */
export function nextOccurrenceDate(
  startDate: Date,
  frequency: RecurringFrequency,
  endDate: Date | null,
  after: Date
): Date | null {
  const afterTs = after.getTime();
  // Estimate k from elapsed time to avoid iterating too far.
  let k = 0;
  if (frequency === "WEEKLY") {
    k = Math.floor((afterTs - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
  } else if (frequency === "MONTHLY") {
    k =
      (after.getUTCFullYear() - startDate.getUTCFullYear()) * 12 +
      (after.getUTCMonth() - startDate.getUTCMonth());
  } else {
    k = after.getUTCFullYear() - startDate.getUTCFullYear();
  }

  // Start from k, scan forward until we find one after `after`.
  const startK = Math.max(0, k - 1);
  for (let i = startK; i <= startK + 10; i++) {
    const date = computeOccurrenceDate(startDate, frequency, i);
    if (date.getTime() > afterTs) {
      if (endDate && date.getTime() > endDate.getTime()) return null;
      return date;
    }
  }
  return null;
}

/**
 * Materialize all due recurring transactions for a user.
 * Idempotent: the RecurringOccurrence unique constraint ensures
 * a (template, occurrenceDate) pair is created at most once.
 */
export async function materializeDueForUser(userId: string, today: Date) {
  const templates = await prisma.recurringTemplate.findMany({
    where: { userId, isActive: true },
    include: { occurrences: true },
  });

  let created = 0;

  for (const template of templates) {
    const existingDates = new Set(
      template.occurrences.map((o) => o.occurrenceDate.toISOString().slice(0, 10))
    );

    // Compute which occurrences should exist up to `today`.
    const startDate = template.startDate;
    const endDate = template.endDate;
    const todayTs = today.getTime();

    for (let k = 0; k < 520; k++) {
      // 520 = ~10 years of weekly
      const occDate = computeOccurrenceDate(startDate, template.frequency, k);
      if (occDate.getTime() > todayTs) break;
      if (endDate && occDate.getTime() > endDate.getTime()) break;

      const dateKey = occDate.toISOString().slice(0, 10);
      if (existingDates.has(dateKey)) continue;

      try {
        // The unique constraint is the idempotency guard.
        await prisma.$transaction(async (tx) => {
          const occurrence = await tx.recurringOccurrence.create({
            data: {
              templateId: template.id,
              occurrenceDate: occDate,
            },
          });

          const transaction = await tx.transaction.create({
            data: {
              userId: template.userId,
              categoryId: template.categoryId,
              type: template.type,
              amount: template.amount,
              currencyCode: template.currencyCode,
              date: occDate,
              note: template.note,
              paymentMethod: template.paymentMethod as PaymentMethod,
              recurringTemplateId: template.id,
              occurrenceDate: occDate,
            },
          });

          await tx.recurringOccurrence.update({
            where: { id: occurrence.id },
            data: { transactionId: transaction.id },
          });
        });
        created++;
      } catch {
        // P2002 = duplicate — another process materialized this occurrence already. Safe to skip.
      }
    }
  }

  return created;
}

/**
 * Materialize all due recurring transactions across all users.
 * Used by the sweep worker.
 */
export async function materializeAllDue() {
  const users = await prisma.user.findMany({
    where: { recurringTemplates: { some: { isActive: true } } },
    select: { id: true, timezone: true },
  });

  let total = 0;
  for (const user of users) {
    // "Today" in the user's timezone.
    const today = new Date(
      new Date().toLocaleDateString("en-CA", { timeZone: user.timezone })
    );
    total += await materializeDueForUser(user.id, today);
  }

  return total;
}
