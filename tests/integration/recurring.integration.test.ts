import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { materializeDueForUser } from "@/lib/recurring";
import {
  createTestUser,
  cleanupTestUsers,
  type TestUser,
} from "./helpers";

let t: TestUser;

beforeEach(async () => {
  t = await createTestUser();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await cleanupTestUsers();
});

async function makeTemplate(
  overrides: Partial<{
    frequency: "WEEKLY" | "MONTHLY" | "YEARLY";
    startDate: Date;
    endDate: Date | null;
    isActive: boolean;
    amount: string;
  }> = {}
) {
  return prisma.recurringTemplate.create({
    data: {
      userId: t.user.id,
      categoryId: t.category.id,
      type: "EXPENSE",
      amount: overrides.amount ?? "50.00",
      currencyCode: "USD",
      frequency: overrides.frequency ?? "MONTHLY",
      startDate: overrides.startDate ?? new Date("2026-01-15T00:00:00Z"),
      endDate: overrides.endDate ?? null,
      paymentMethodId: t.paymentMethod.id,
      isActive: overrides.isActive ?? true,
    },
  });
}

const TODAY = new Date("2026-03-20T00:00:00Z");

describe("materializeDueForUser", () => {
  it("materializes all due occurrences, then is idempotent on re-run", async () => {
    const template = await makeTemplate();

    const created = await materializeDueForUser(t.user.id, TODAY);
    expect(created).toBe(3); // Jan 15, Feb 15, Mar 15

    const again = await materializeDueForUser(t.user.id, TODAY);
    expect(again).toBe(0);

    const occurrences = await prisma.recurringOccurrence.findMany({
      where: { templateId: template.id },
      orderBy: { occurrenceDate: "asc" },
    });
    expect(occurrences.map((o) => o.occurrenceDate.toISOString().slice(0, 10))).toEqual([
      "2026-01-15",
      "2026-02-15",
      "2026-03-15",
    ]);

    const transactions = await prisma.transaction.findMany({
      where: { recurringTemplateId: template.id },
      orderBy: { date: "asc" },
    });
    expect(transactions).toHaveLength(3);
    for (const tx of transactions) {
      expect(tx.amount.toString()).toBe("50");
      expect(tx.occurrenceDate).not.toBeNull();
    }
    // Every occurrence links back to its transaction.
    for (const occ of occurrences) {
      expect(occ.transactionId).not.toBeNull();
    }
  });

  it("catches up missed weekly occurrences", async () => {
    await makeTemplate({
      frequency: "WEEKLY",
      startDate: new Date("2026-01-05T00:00:00Z"),
    });
    const created = await materializeDueForUser(
      t.user.id,
      new Date("2026-01-26T00:00:00Z")
    );
    expect(created).toBe(4); // Jan 5, 12, 19, 26
  });

  it("treats endDate as inclusive", async () => {
    await makeTemplate({ endDate: new Date("2026-02-15T00:00:00Z") });
    const created = await materializeDueForUser(t.user.id, TODAY);
    expect(created).toBe(2); // Jan 15, Feb 15 only
  });

  it("skips inactive templates", async () => {
    await makeTemplate({ isActive: false });
    expect(await materializeDueForUser(t.user.id, TODAY)).toBe(0);
  });

  it("clamps month-end occurrences through the database", async () => {
    const template = await makeTemplate({
      startDate: new Date("2026-01-31T00:00:00Z"),
    });
    const created = await materializeDueForUser(
      t.user.id,
      new Date("2026-03-31T00:00:00Z")
    );
    expect(created).toBe(3);
    const occurrences = await prisma.recurringOccurrence.findMany({
      where: { templateId: template.id },
      orderBy: { occurrenceDate: "asc" },
    });
    expect(occurrences.map((o) => o.occurrenceDate.toISOString().slice(0, 10))).toEqual([
      "2026-01-31",
      "2026-02-28",
      "2026-03-31",
    ]);
  });

  it("concurrent sweeps create each occurrence exactly once", async () => {
    const template = await makeTemplate();
    const [a, b] = await Promise.all([
      materializeDueForUser(t.user.id, TODAY),
      materializeDueForUser(t.user.id, TODAY),
    ]);
    expect(a + b).toBe(3);
    expect(
      await prisma.recurringOccurrence.count({ where: { templateId: template.id } })
    ).toBe(3);
    expect(
      await prisma.transaction.count({ where: { recurringTemplateId: template.id } })
    ).toBe(3);
  });

  it("skips P2002 duplicates from a racing process and continues", async () => {
    await makeTemplate();
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "6.19.3",
      })
    );
    const created = await materializeDueForUser(t.user.id, TODAY);
    expect(created).toBe(2); // first occurrence "lost the race", other two created
  });

  it("propagates non-duplicate failures instead of swallowing them", async () => {
    await makeTemplate();
    vi.spyOn(prisma, "$transaction").mockRejectedValueOnce(
      new Error("connection lost")
    );
    await expect(materializeDueForUser(t.user.id, TODAY)).rejects.toThrow(
      "connection lost"
    );
  });
});
