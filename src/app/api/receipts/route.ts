import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { uploadReceipt } from "@/lib/s3";
import { randomUUID } from "crypto";

const MAX_SIZE = 4 * 1024 * 1024; // 4MB — Vercel rejects request bodies over 4.5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(req: NextRequest) {
  const user = await requireUser();

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: "Only JPEG, PNG, and WebP images are allowed" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "File must be under 4MB" },
      { status: 400 }
    );
  }

  const key = `receipts/${user.id}/${randomUUID()}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await uploadReceipt(key, buffer, file.type);

  const receipt = await prisma.receipt.create({
    data: {
      userId: user.id,
      objectKey: key,
      mimeType: file.type,
      sizeBytes: file.size,
    },
  });

  return NextResponse.json({
    receiptId: receipt.id,
    url: `/api/receipts/${receipt.id}`,
  });
}
