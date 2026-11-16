import { NextRequest, NextResponse } from "next/server";
import { materializeAllDue } from "@/lib/recurring";

/**
 * Vercel Cron endpoint — replaces the long-lived Docker sweep worker
 * (`src/jobs/recurring-sweep.ts`) for serverless deployments.
 *
 * Lazy-on-read materialization provides the correctness guarantee; this sweep
 * is the completeness backstop for users who never log in. Idempotent via the
 * RecurringOccurrence unique (templateId, occurrenceDate) constraint, so
 * duplicate cron deliveries are harmless.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const created = await materializeAllDue();
  return NextResponse.json({ ok: true, created });
}
