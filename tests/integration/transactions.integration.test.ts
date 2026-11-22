import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createTransactionAction,
  updateTransactionAction,
  deleteTransactionAction,
} from "@/lib/actions/transactions";
import {
  getTransaction,
  listTransactions,
  updateTransaction,
  deleteTransaction,
} from "@/lib/queries/transactions";
import { transactionFilterSchema } from "@/lib/validation";
import {
  createTestUser,
  cleanupTestUsers,
  actAs,
  addTransaction,
  addReceipt,
  txFormData,
  validTxFields,
  expectRedirect,
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

describe("createTransactionAction", () => {
  it("persists exact Decimal amount, UTC date, and links the receipt", async () => {
    const receipt = await addReceipt(t.user.id);
    const fd = txFormData({
      ...validTxFields(t),
      amount: "1234.5678",
      receiptId: receipt.id,
    });

    await expectRedirect(createTransactionAction(fd), "/transactions");

    const row = await prisma.transaction.findFirstOrThrow({
      where: { userId: t.user.id },
    });
    expect(row.amount.toString()).toBe("1234.5678");
    expect(row.date.toISOString()).toBe("2026-11-15T00:00:00.000Z");
    const linked = await prisma.receipt.findUniqueOrThrow({
      where: { id: receipt.id },
    });
    expect(linked.transactionId).toBe(row.id);
  });

  it("rejects another user's category", async () => {
    const b = await createTestUser();
    const result = await createTransactionAction(
      txFormData({ ...validTxFields(t), categoryId: b.category.id })
    );
    expect(result).toEqual({ error: "Invalid category" });
    expect(await prisma.transaction.count({ where: { userId: t.user.id } })).toBe(0);
  });

  it("rejects category kind that doesn't match the transaction type", async () => {
    const result = await createTransactionAction(
      txFormData({ ...validTxFields(t), categoryId: t.incomeCategory.id })
    );
    expect(result).toEqual({ error: "Category does not match transaction type" });
  });

  it("rejects another user's payment method", async () => {
    const b = await createTestUser();
    const result = await createTransactionAction(
      txFormData({ ...validTxFields(t), paymentMethodId: b.paymentMethod.id })
    );
    expect(result).toEqual({ error: "Invalid payment method" });
  });

  it("rejects another user's receipt", async () => {
    const b = await createTestUser();
    const receipt = await addReceipt(b.user.id);
    const result = await createTransactionAction(
      txFormData({ ...validTxFields(t), receiptId: receipt.id })
    );
    expect(result).toEqual({ error: "Invalid receipt" });
  });

  it("rejects a receipt already attached to another transaction", async () => {
    const receipt = await addReceipt(t.user.id);
    await addTransaction(t, { receiptId: receipt.id });
    const result = await createTransactionAction(
      txFormData({ ...validTxFields(t), receiptId: receipt.id })
    );
    expect(result).toEqual({ error: "Receipt already attached to a transaction" });
  });

  it("rejects an overflow calendar date", async () => {
    const result = await createTransactionAction(
      txFormData({ ...validTxFields(t), date: "2026-02-31" })
    );
    expect(result).toEqual({ error: "Invalid calendar date" });
  });
});

describe("updateTransactionAction", () => {
  it("updates amount and keeps the receipt when re-submitted", async () => {
    const receipt = await addReceipt(t.user.id);
    const tx = await addTransaction(t, { receiptId: receipt.id });

    await expectRedirect(
      updateTransactionAction(
        tx.id,
        txFormData({ ...validTxFields(t), amount: "20.00", receiptId: receipt.id })
      ),
      `/transactions/${tx.id}`
    );

    const row = await prisma.transaction.findUniqueOrThrow({ where: { id: tx.id } });
    expect(row.amount.toString()).toBe("20");
    const linked = await prisma.receipt.findUniqueOrThrow({ where: { id: receipt.id } });
    expect(linked.transactionId).toBe(tx.id);
  });

  it("unlinks the receipt when receiptId is empty (Remove button)", async () => {
    const receipt = await addReceipt(t.user.id);
    const tx = await addTransaction(t, { receiptId: receipt.id });

    await expectRedirect(
      updateTransactionAction(tx.id, txFormData({ ...validTxFields(t), receiptId: "" })),
      `/transactions/${tx.id}`
    );

    const linked = await prisma.receipt.findUniqueOrThrow({ where: { id: receipt.id } });
    expect(linked.transactionId).toBeNull();
  });

  it("rejects another user's category", async () => {
    const b = await createTestUser();
    const tx = await addTransaction(t);
    const result = await updateTransactionAction(
      tx.id,
      txFormData({ ...validTxFields(t), categoryId: b.category.id })
    );
    expect(result).toEqual({ error: "Invalid category" });
  });

  it("rejects a type flip that breaks the category kind", async () => {
    const tx = await addTransaction(t); // EXPENSE on an EXPENSE category
    const result = await updateTransactionAction(
      tx.id,
      txFormData({ ...validTxFields(t), type: "INCOME" })
    );
    expect(result).toEqual({ error: "Category does not match transaction type" });
  });
});

describe("cross-user isolation", () => {
  it("user B cannot read, update, or delete user A's transaction", async () => {
    const tx = await addTransaction(t);
    const b = await createTestUser();
    actAs(b);

    expect(await getTransaction(b.user.id, tx.id)).toBeNull();
    expect(await updateTransaction(b.user.id, tx.id, { note: "hacked" })).toBeNull();
    expect(await deleteTransaction(b.user.id, tx.id)).toBe(false);

    const result = await updateTransactionAction(
      tx.id,
      txFormData(validTxFields(b))
    );
    expect(result).toEqual({ error: "Transaction not found" });

    expect(await prisma.transaction.findUnique({ where: { id: tx.id } })).not.toBeNull();
  });

  it("deleteTransactionAction removes own transaction", async () => {
    const tx = await addTransaction(t);
    await expectRedirect(deleteTransactionAction(tx.id), "/transactions");
    expect(await prisma.transaction.findUnique({ where: { id: tx.id } })).toBeNull();
  });
});

describe("listTransactions", () => {
  it("filters by type, date range, amount range, and note search", async () => {
    const coffee = await addTransaction(t, {
      amount: "5.00",
      date: new Date("2026-11-01T00:00:00Z"),
      note: "Coffee shop",
    });
    await addTransaction(t, {
      amount: "500.00",
      date: new Date("2026-11-20T00:00:00Z"),
      note: "Rent",
    });
    await addTransaction(t, {
      type: "INCOME",
      categoryId: t.incomeCategory.id,
      amount: "5.00",
      date: new Date("2026-11-05T00:00:00Z"),
      note: "Coffee refund",
    });
    await addTransaction(t, {
      amount: "5.00",
      date: new Date("2026-10-01T00:00:00Z"),
      note: "Coffee October",
    });

    const page = await listTransactions(
      t.user.id,
      transactionFilterSchema.parse({
        type: "EXPENSE",
        dateFrom: "2026-11-01",
        dateTo: "2026-11-30",
        amountMax: "100",
        q: "coffee",
      })
    );
    expect(page.items.map((i) => i.id)).toEqual([coffee.id]);
  });

  it("cursor pagination walks all rows exactly once", async () => {
    const ids: string[] = [];
    for (let i = 0; i < 5; i++) {
      const tx = await addTransaction(t, { note: `tx ${i}` });
      ids.push(tx.id);
    }

    const seen: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const res = await listTransactions(
        t.user.id,
        transactionFilterSchema.parse({ limit: 2, cursor })
      );
      seen.push(...res.items.map((i) => i.id));
      if (!res.nextCursor) break;
      cursor = res.nextCursor;
    }

    expect(seen).toHaveLength(5);
    expect(new Set(seen).size).toBe(5);
    expect(seen.sort()).toEqual(ids.sort());
  });
});

describe("RSC serialization boundary", () => {
  it("getTransaction returns exact string amount/lat/lng", async () => {
    const tx = await addTransaction(t, {
      amount: "1234.5678",
      lat: new Prisma.Decimal("51.507400"),
      lng: new Prisma.Decimal("-0.127800"),
    });

    const row = await getTransaction(t.user.id, tx.id);
    expect(row).not.toBeNull();
    expect(row!.amount).toBe("1234.5678");
    expect(row!.lat).toBe("51.5074");
    expect(row!.lng).toBe("-0.1278");
  });

  it("listTransactions returns string amounts and null coordinates", async () => {
    await addTransaction(t, { amount: "10.00" });

    const page = await listTransactions(
      t.user.id,
      transactionFilterSchema.parse({})
    );
    expect(page.items).toHaveLength(1);
    expect(page.items[0].amount).toBe("10");
    expect(page.items[0].lat).toBeNull();
    expect(page.items[0].lng).toBeNull();
  });
});
