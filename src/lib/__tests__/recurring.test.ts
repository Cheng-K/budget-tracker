import { describe, it, expect } from "vitest";
import { computeOccurrenceDate, nextOccurrenceDate } from "@/lib/recurring";

describe("computeOccurrenceDate", () => {
  describe("WEEKLY", () => {
    it("computes k=0 as start date", () => {
      const start = new Date("2026-01-05T00:00:00Z"); // Monday
      const result = computeOccurrenceDate(start, "WEEKLY", 0);
      expect(result.toISOString().slice(0, 10)).toBe("2026-01-05");
    });

    it("computes k=1 as +7 days", () => {
      const start = new Date("2026-01-05T00:00:00Z");
      const result = computeOccurrenceDate(start, "WEEKLY", 1);
      expect(result.toISOString().slice(0, 10)).toBe("2026-01-12");
    });

    it("computes k=4 as +28 days", () => {
      const start = new Date("2026-01-05T00:00:00Z");
      const result = computeOccurrenceDate(start, "WEEKLY", 4);
      expect(result.toISOString().slice(0, 10)).toBe("2026-02-02");
    });
  });

  describe("MONTHLY", () => {
    it("computes k=0 as start date", () => {
      const start = new Date("2026-01-15T00:00:00Z");
      const result = computeOccurrenceDate(start, "MONTHLY", 0);
      expect(result.toISOString().slice(0, 10)).toBe("2026-01-15");
    });

    it("computes k=1 as next month same day", () => {
      const start = new Date("2026-01-15T00:00:00Z");
      const result = computeOccurrenceDate(start, "MONTHLY", 1);
      expect(result.toISOString().slice(0, 10)).toBe("2026-02-15");
    });

    it("clamps Jan 31 monthly to Feb 28 (non-leap)", () => {
      const start = new Date("2026-01-31T00:00:00Z");
      const result = computeOccurrenceDate(start, "MONTHLY", 1);
      expect(result.toISOString().slice(0, 10)).toBe("2026-02-28");
    });

    it("clamps Jan 31 monthly to Feb 29 (leap year)", () => {
      const start = new Date("2024-01-31T00:00:00Z");
      const result = computeOccurrenceDate(start, "MONTHLY", 1);
      expect(result.toISOString().slice(0, 10)).toBe("2024-02-29");
    });

    it("crosses year boundary", () => {
      const start = new Date("2025-11-15T00:00:00Z");
      const result = computeOccurrenceDate(start, "MONTHLY", 2);
      expect(result.toISOString().slice(0, 10)).toBe("2026-01-15");
    });

    it("computes k=12 as same month next year", () => {
      const start = new Date("2026-03-10T00:00:00Z");
      const result = computeOccurrenceDate(start, "MONTHLY", 12);
      expect(result.toISOString().slice(0, 10)).toBe("2027-03-10");
    });
  });

  describe("YEARLY", () => {
    it("computes k=0 as start date", () => {
      const start = new Date("2026-06-15T00:00:00Z");
      const result = computeOccurrenceDate(start, "YEARLY", 0);
      expect(result.toISOString().slice(0, 10)).toBe("2026-06-15");
    });

    it("computes k=1 as +1 year", () => {
      const start = new Date("2026-06-15T00:00:00Z");
      const result = computeOccurrenceDate(start, "YEARLY", 1);
      expect(result.toISOString().slice(0, 10)).toBe("2027-06-15");
    });

    it("clamps Feb 29 yearly on non-leap years", () => {
      const start = new Date("2024-02-29T00:00:00Z");
      const result = computeOccurrenceDate(start, "YEARLY", 1);
      expect(result.toISOString().slice(0, 10)).toBe("2025-02-28");
    });
  });
});

describe("nextOccurrenceDate", () => {
  it("returns start date if it's in the future", () => {
    const start = new Date("2027-01-01T00:00:00Z");
    const result = nextOccurrenceDate(start, "MONTHLY", null, new Date("2026-06-15T00:00:00Z"));
    expect(result?.toISOString().slice(0, 10)).toBe("2027-01-01");
  });

  it("returns next occurrence after today", () => {
    const start = new Date("2026-01-15T00:00:00Z");
    const result = nextOccurrenceDate(start, "MONTHLY", null, new Date("2026-01-20T00:00:00Z"));
    expect(result?.toISOString().slice(0, 10)).toBe("2026-02-15");
  });

  it("returns null if past end date", () => {
    const start = new Date("2026-01-15T00:00:00Z");
    const end = new Date("2026-03-15T00:00:00Z");
    const result = nextOccurrenceDate(start, "MONTHLY", end, new Date("2026-04-01T00:00:00Z"));
    expect(result).toBeNull();
  });

  it("returns weekly next date", () => {
    const start = new Date("2026-01-05T00:00:00Z"); // Monday
    const result = nextOccurrenceDate(start, "WEEKLY", null, new Date("2026-01-06T00:00:00Z"));
    expect(result?.toISOString().slice(0, 10)).toBe("2026-01-12");
  });
});
