import { describe, it, expect } from "vitest";
import {
  getMonthRange,
  getPrevMonth,
  getNextMonth,
  utcMonthStart,
  utcMonthEnd,
} from "@/lib/month";

describe("getMonthRange", () => {
  it("returns UTC midnight bounds for a valid month", () => {
    const { start, end, key, label } = getMonthRange("2026-11");
    expect(start.toISOString()).toBe("2026-11-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-11-30T00:00:00.000Z");
    expect(key).toBe("2026-11");
    expect(label).toBe("November 2026");
  });

  it("handles December and the year rollover", () => {
    const { start, end, key } = getMonthRange("2026-12");
    expect(start.toISOString()).toBe("2026-12-01T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-12-31T00:00:00.000Z");
    expect(key).toBe("2026-12");
    expect(getNextMonth(start).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });

  it("handles leap-year February", () => {
    const { end } = getMonthRange("2024-02");
    expect(end.toISOString()).toBe("2024-02-29T00:00:00.000Z");
  });

  it("handles non-leap February", () => {
    const { end } = getMonthRange("2026-02");
    expect(end.toISOString()).toBe("2026-02-28T00:00:00.000Z");
  });

  it("falls back to the current UTC month for invalid params", () => {
    const now = new Date();
    const expectedKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    expect(getMonthRange("garbage").key).toBe(expectedKey);
    expect(getMonthRange(null).key).toBe(expectedKey);
    expect(getMonthRange(undefined).key).toBe(expectedKey);
    expect(getMonthRange("2026-13").key).toBe(expectedKey); // regex rejects month 13
  });
});

describe("getPrevMonth / getNextMonth", () => {
  it("rolls back across the year boundary", () => {
    const jan = new Date(Date.UTC(2026, 0, 1));
    expect(getPrevMonth(jan).toISOString()).toBe("2025-12-01T00:00:00.000Z");
  });

  it("always lands on the 1st at UTC midnight", () => {
    const midMonth = new Date(Date.UTC(2026, 5, 15, 12, 30));
    expect(getPrevMonth(midMonth).toISOString()).toBe("2026-05-01T00:00:00.000Z");
    expect(getNextMonth(midMonth).toISOString()).toBe("2026-07-01T00:00:00.000Z");
  });
});

describe("utcMonthStart / utcMonthEnd", () => {
  it("match getMonthRange bounds", () => {
    const { start, end } = getMonthRange("2026-11");
    expect(utcMonthStart(2026, 10).toISOString()).toBe(start.toISOString());
    expect(utcMonthEnd(2026, 10).toISOString()).toBe(end.toISOString());
  });

  it("handle month index overflow (December -> next year)", () => {
    expect(utcMonthEnd(2026, 11).toISOString()).toBe("2026-12-31T00:00:00.000Z");
    expect(utcMonthStart(2026, 12).toISOString()).toBe("2027-01-01T00:00:00.000Z");
  });
});
