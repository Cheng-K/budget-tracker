import { prisma } from "@/lib/db";

export async function getReceipt(userId: string, id: string) {
  return prisma.receipt.findFirst({ where: { id, userId } });
}
