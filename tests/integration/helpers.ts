import { vi, expect } from "vitest";
import type { Category, PaymentMethod, User } from "@prisma/client";
import { prisma } from "@/lib/db";
import { seedUserDefaults } from "@/lib/seed-user";
import { requireUser } from "@/lib/require-user";
import { createTransaction } from "@/lib/queries/transactions";

export interface TestUser {
  user: User;
  category: Category; // EXPENSE
  incomeCategory: Category; // INCOME
  paymentMethod: PaymentMethod;
}

const createdUserIds: string[] = [];
let counter = 0;

/** Fresh isolated user with seeded defaults; cleaned up by cleanupTestUsers(). */
export async function createTestUser(): Promise<TestUser> {
  const email = `integration-${Date.now()}-${process.pid}-${counter++}@example.test`;
  const user = await prisma.user.create({
    data: { email, currencyCode: "USD", timezone: "UTC" },
  });
  createdUserIds.push(user.id);
  await seedUserDefaults(user.id);
  const category = await prisma.category.findFirstOrThrow({
    where: { userId: user.id, kind: "EXPENSE" },
  });
  const incomeCategory = await prisma.category.findFirstOrThrow({
    where: { userId: user.id, kind: "INCOME" },
  });
  const paymentMethod = await prisma.paymentMethod.findFirstOrThrow({
    where: { userId: user.id },
  });
  return { user, category, incomeCategory, paymentMethod };
}

/** Deletes every user created via createTestUser (cascades all their rows). */
export async function cleanupTestUsers(): Promise<void> {
  const ids = createdUserIds.splice(0);
  if (ids.length > 0) {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }
}

/** Point the mocked requireUser at a test user for action-level tests. */
export function actAs(t: TestUser): void {
  vi.mocked(requireUser).mockResolvedValue({
    id: t.user.id,
    currencyCode: t.user.currencyCode,
    timezone: t.user.timezone,
  } as Awaited<ReturnType<typeof requireUser>>);
}

export function txFormData(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

/** Valid create-transaction fields for a test user; override as needed. */
export function validTxFields(t: TestUser): Record<string, string> {
  return {
    type: "EXPENSE",
    amount: "10.00",
    categoryId: t.category.id,
    date: "2026-11-15",
    note: "",
    paymentMethodId: t.paymentMethod.id,
    locationLabel: "",
    lat: "",
    lng: "",
    receiptId: "",
  };
}

export async function addReceipt(userId: string) {
  return prisma.receipt.create({
    data: {
      userId,
      objectKey: `receipts/${userId}/${Math.random().toString(36).slice(2)}`,
      mimeType: "image/png",
      sizeBytes: 10,
    },
  });
}

type TransactionData = Parameters<typeof createTransaction>[2];

export async function addTransaction(t: TestUser, overrides: Partial<TransactionData> = {}) {
  return createTransaction(t.user.id, t.user.currencyCode ?? "USD", {
    type: "EXPENSE",
    amount: "10.00",
    categoryId: t.category.id,
    date: new Date("2026-11-15T00:00:00Z"),
    paymentMethodId: t.paymentMethod.id,
    ...overrides,
  });
}

/** Actions end with redirect(), which the setup mock turns into a throw. */
export async function expectRedirect(promise: Promise<unknown>, path: string) {
  await expect(promise).rejects.toThrow(`NEXT_REDIRECT:${path}`);
}
