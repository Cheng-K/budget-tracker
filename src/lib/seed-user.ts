import { prisma } from "@/lib/db";
import { DEFAULT_CATEGORIES } from "@/lib/default-categories";
import { DEFAULT_PAYMENT_METHODS } from "@/lib/default-payment-methods";

/** Seed the per-user default category and payment-method sets. Idempotent. */
export async function seedUserDefaults(userId: string): Promise<void> {
  await prisma.category.createMany({
    data: DEFAULT_CATEGORIES.map((c) => ({
      userId,
      name: c.name,
      kind: c.kind,
      icon: c.icon,
      sortOrder: c.sortOrder,
    })),
    skipDuplicates: true,
  });
  await prisma.paymentMethod.createMany({
    data: DEFAULT_PAYMENT_METHODS.map((m) => ({
      userId,
      name: m.name,
      sortOrder: m.sortOrder,
    })),
    skipDuplicates: true,
  });
}
