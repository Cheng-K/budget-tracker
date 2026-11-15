import { NextRequest } from "next/server";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { transactionFilterSchema } from "@/lib/validation";
import { csvBom, csvRow } from "@/lib/csv";
import { format } from "date-fns";
import type { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await requireUser();

  const sp = req.nextUrl.searchParams;
  const filter = transactionFilterSchema.parse({
    q: sp.get("q") || undefined,
    type: sp.get("type") || undefined,
    categoryId: sp.get("categoryId") || undefined,
    dateFrom: sp.get("dateFrom") || undefined,
    dateTo: sp.get("dateTo") || undefined,
    amountMin: sp.get("amountMin") || undefined,
    amountMax: sp.get("amountMax") || undefined,
    limit: 200,
  });

  const where: Prisma.TransactionWhereInput = { userId: user.id };
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

  const filename = `transactions-${filter.dateFrom ?? "all"}_${filter.dateTo ?? "all"}.csv`;

  // Stream the CSV using cursor pagination.
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(encoder.encode(csvBom()));
      controller.enqueue(
        encoder.encode(
          csvRow([
            "date",
            "type",
            "category",
            "amount",
            "currency",
            "note",
            "payment_method",
            "location_label",
            "latitude",
            "longitude",
            "created_at",
          ])
        )
      );

      let cursor: string | undefined;
      const batchSize = 1000;

      for (;;) {
        const batch = await prisma.transaction.findMany({
          where,
          include: { category: true },
          orderBy: [{ date: "asc" }, { id: "asc" }],
          take: batchSize,
          ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });

        if (batch.length === 0) break;

        for (const t of batch) {
          controller.enqueue(
            encoder.encode(
              csvRow([
                format(t.date, "yyyy-MM-dd"),
                t.type === "INCOME" ? "income" : "expense",
                t.category.name,
                t.amount.toString(),
                t.currencyCode,
                t.note ?? "",
                t.paymentMethod.toLowerCase().replace(/_/g, " "),
                t.locationLabel ?? "",
                t.lat ? String(t.lat) : "",
                t.lng ? String(t.lng) : "",
                t.createdAt.toISOString(),
              ])
            )
          );
        }

        cursor = batch[batch.length - 1].id;
        if (batch.length < batchSize) break;
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    },
  });
}
