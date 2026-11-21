import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { prisma } from "@/lib/db";
import {
  deleteCategory,
  renameCategory,
  reorderCategories,
} from "@/lib/queries/categories";
import {
  deletePaymentMethod,
  reorderPaymentMethods,
} from "@/lib/queries/payment-methods";
import { createPaymentMethodAction } from "@/lib/actions/payment-methods";
import { seedUserDefaults } from "@/lib/seed-user";
import {
  createTestUser,
  cleanupTestUsers,
  actAs,
  addTransaction,
  txFormData,
  type TestUser,
} from "./helpers";

let t: TestUser;

beforeEach(async () => {
  t = await createTestUser();
  actAs(t);
});

afterEach(async () => {
  await cleanupTestUsers();
  vi.clearAllMocks();
});

describe("deleteCategory guards", () => {
  it("refuses when transactions reference the category", async () => {
    await addTransaction(t);
    const result = await deleteCategory(t.user.id, t.category.id);
    expect(result).toEqual({ ok: false, reason: "has_transactions" });
  });

  it("refuses when recurring templates reference the category", async () => {
    await prisma.recurringTemplate.create({
      data: {
        userId: t.user.id,
        categoryId: t.category.id,
        type: "EXPENSE",
        amount: "10.00",
        currencyCode: "USD",
        frequency: "MONTHLY",
        startDate: new Date("2026-01-15T00:00:00Z"),
        paymentMethodId: t.paymentMethod.id,
      },
    });
    const result = await deleteCategory(t.user.id, t.category.id);
    expect(result).toEqual({ ok: false, reason: "has_templates" });
  });

  it("deletes an unused category", async () => {
    const extra = await prisma.category.create({
      data: { userId: t.user.id, name: "Extra", kind: "EXPENSE" },
    });
    const result = await deleteCategory(t.user.id, extra.id);
    expect(result).toEqual({ ok: true });
    expect(await prisma.category.findUnique({ where: { id: extra.id } })).toBeNull();
  });

  it("cannot delete another user's category", async () => {
    const b = await createTestUser();
    const result = await deleteCategory(b.user.id, t.category.id);
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });
});

describe("deletePaymentMethod guards", () => {
  it("refuses when transactions reference the payment method", async () => {
    await addTransaction(t);
    const result = await deletePaymentMethod(t.user.id, t.paymentMethod.id);
    expect(result).toEqual({ ok: false, reason: "has_transactions" });
  });

  it("deletes an unused payment method", async () => {
    const extra = await prisma.paymentMethod.create({
      data: { userId: t.user.id, name: "Extra" },
    });
    expect(await deletePaymentMethod(t.user.id, extra.id)).toEqual({ ok: true });
  });
});

describe("ownership on mutations", () => {
  it("reorder rejects a foreign id without touching any row", async () => {
    const b = await createTestUser();
    const own = await prisma.category.findMany({
      where: { userId: t.user.id, kind: "EXPENSE" },
      orderBy: { sortOrder: "asc" },
    });
    const before = own.map((c) => c.sortOrder);

    const ok = await reorderCategories(t.user.id, [own[0].id, b.category.id]);
    expect(ok).toBe(false);

    const after = await prisma.category.findMany({
      where: { userId: t.user.id, kind: "EXPENSE" },
      orderBy: { sortOrder: "asc" },
    });
    expect(after.map((c) => c.sortOrder)).toEqual(before);
  });

  it("reorderPaymentMethods rejects a foreign id", async () => {
    const b = await createTestUser();
    const ok = await reorderPaymentMethods(t.user.id, [
      t.paymentMethod.id,
      b.paymentMethod.id,
    ]);
    expect(ok).toBe(false);
  });

  it("rename of another user's category returns null", async () => {
    const b = await createTestUser();
    expect(await renameCategory(b.user.id, t.category.id, "Hacked")).toBeNull();
    const unchanged = await prisma.category.findUniqueOrThrow({
      where: { id: t.category.id },
    });
    expect(unchanged.name).toBe(t.category.name);
  });
});

describe("createPaymentMethodAction", () => {
  it("returns a friendly error on duplicate name", async () => {
    const result = await createPaymentMethodAction(
      txFormData({ name: t.paymentMethod.name })
    );
    expect(result).toEqual({ error: "Name already used" });
  });
});

describe("seedUserDefaults", () => {
  it("is idempotent", async () => {
    const categoriesBefore = await prisma.category.count({ where: { userId: t.user.id } });
    const methodsBefore = await prisma.paymentMethod.count({ where: { userId: t.user.id } });

    await seedUserDefaults(t.user.id);

    expect(await prisma.category.count({ where: { userId: t.user.id } })).toBe(categoriesBefore);
    expect(await prisma.paymentMethod.count({ where: { userId: t.user.id } })).toBe(methodsBefore);
  });
});
