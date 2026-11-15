import { describe, it, expect } from "vitest";
import {
  toDecimal,
  formatAmount,
  formatMoney,
  sumDecimals,
  subtractDecimals,
  parseUserAmount,
  isLess,
  ZERO,
} from "@/lib/money";

describe("toDecimal", () => {
  it("parses strings", () => {
    expect(toDecimal("123.45").toFixed(2)).toBe("123.45");
  });
  it("parses numbers", () => {
    expect(toDecimal(100).toFixed(2)).toBe("100.00");
  });
  it("passes through Decimal", () => {
    const d = toDecimal("42.5");
    expect(toDecimal(d)).toBe(d);
  });
});

describe("formatAmount", () => {
  it("formats with 2 dp by default", () => {
    expect(formatAmount("123.4")).toBe("123.40");
    expect(formatAmount("123.456")).toBe("123.46");
  });
  it("supports custom precision", () => {
    expect(formatAmount("123.4567", 4)).toBe("123.4567");
  });
});

describe("formatMoney", () => {
  it("formats USD", () => {
    const result = formatMoney("1234.56", "USD", "en-US");
    expect(result).toContain("1,234.56");
    expect(result).toContain("$");
  });
  it("falls back to code on invalid currency", () => {
    const result = formatMoney("100", "XYZ");
    expect(result).toContain("XYZ");
    expect(result).toContain("100");
  });
});

describe("sumDecimals", () => {
  it("sums a list", () => {
    expect(sumDecimals(["10.50", "20.25", "0.25"]).toFixed(2)).toBe("31.00");
  });
  it("returns zero for empty list", () => {
    expect(sumDecimals([]).toFixed(2)).toBe("0.00");
  });
  it("handles float-safe math", () => {
    // 0.1 + 0.2 !== 0.3 in float; Decimal must be exact.
    expect(sumDecimals(["0.1", "0.2"]).toFixed(1)).toBe("0.3");
  });
});

describe("subtractDecimals", () => {
  it("subtracts", () => {
    expect(subtractDecimals("100", "30.75").toFixed(2)).toBe("69.25");
  });
});

describe("isLess", () => {
  it("compares", () => {
    expect(isLess("10", "20")).toBe(true);
    expect(isLess("20", "10")).toBe(false);
    expect(isLess("10", "10")).toBe(false);
  });
});

describe("parseUserAmount", () => {
  it("parses plain numbers", () => {
    expect(parseUserAmount("42.50")?.toFixed(2)).toBe("42.50");
  });
  it("strips currency symbols", () => {
    expect(parseUserAmount("$1,234.56")?.toFixed(2)).toBe("1234.56");
  });
  it("rejects negatives", () => {
    expect(parseUserAmount("-5")).toBeNull();
  });
  it("rejects empty", () => {
    expect(parseUserAmount("")).toBeNull();
  });
  it("rejects garbage", () => {
    expect(parseUserAmount("abc")).toBeNull();
  });
});

describe("ZERO", () => {
  it("is zero", () => {
    expect(ZERO.toFixed(2)).toBe("0.00");
  });
});
