import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// The sweep itself is covered by integration tests; here we only prove
// the bearer-secret gate, so mock the DB-touching worker.
vi.mock("@/lib/recurring", () => ({
  materializeAllDue: vi.fn(),
}));

import { GET } from "@/app/api/cron/recurring-sweep/route";
import { materializeAllDue } from "@/lib/recurring";

function request(authorization?: string): NextRequest {
  return new NextRequest("http://localhost:3000/api/cron/recurring-sweep", {
    headers: authorization ? { authorization } : {},
  });
}

const ORIGINAL_SECRET = process.env.CRON_SECRET;

beforeEach(() => {
  vi.mocked(materializeAllDue).mockResolvedValue(2);
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.CRON_SECRET;
  else process.env.CRON_SECRET = ORIGINAL_SECRET;
  vi.clearAllMocks();
});

describe("cron recurring-sweep auth gate", () => {
  it("rejects with 401 when CRON_SECRET is not configured", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(request("Bearer anything"));
    expect(res.status).toBe(401);
    expect(materializeAllDue).not.toHaveBeenCalled();
  });

  it("rejects a request without an authorization header", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(request());
    expect(res.status).toBe(401);
    expect(materializeAllDue).not.toHaveBeenCalled();
  });

  it("rejects a wrong bearer token", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(request("Bearer wrong"));
    expect(res.status).toBe(401);
    expect(materializeAllDue).not.toHaveBeenCalled();
  });

  it("runs the sweep with the correct bearer token", async () => {
    process.env.CRON_SECRET = "test-secret";
    const res = await GET(request("Bearer test-secret"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, created: 2 });
    expect(materializeAllDue).toHaveBeenCalledOnce();
  });
});
