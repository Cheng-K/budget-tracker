import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/require-user";
import { prisma } from "@/lib/db";
import { getReceiptObject } from "@/lib/s3";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await requireUser();
  const { id } = await params;

  const receipt = await prisma.receipt.findFirst({
    where: { id, userId: user.id },
  });
  if (!receipt) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const obj = await getReceiptObject(receipt.objectKey);
    const bytes = await obj.Body?.transformToByteArray();
    if (!bytes) {
      return NextResponse.json({ error: "Empty object" }, { status: 500 });
    }

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": receipt.mimeType,
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(receipt.sizeBytes),
      },
    });
  } catch {
    return NextResponse.json({ error: "Object not found" }, { status: 404 });
  }
}
