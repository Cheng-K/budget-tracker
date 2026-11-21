import { describe, it, expect } from "vitest";
import { csvEscape, csvRow, csvBom } from "@/lib/csv";

describe("csvEscape", () => {
  it("leaves plain fields untouched", () => {
    expect(csvEscape("Coffee")).toBe("Coffee");
    expect(csvEscape("12.50")).toBe("12.50");
    expect(csvEscape("")).toBe("");
  });

  it("quotes fields containing commas", () => {
    expect(csvEscape("Food, Drink")).toBe('"Food, Drink"');
  });

  it("doubles embedded quotes and wraps", () => {
    expect(csvEscape('a"b,c')).toBe('"a""b,c"');
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes fields containing newlines or carriage returns", () => {
    expect(csvEscape("line1\nline2")).toBe('"line1\nline2"');
    expect(csvEscape("line1\rline2")).toBe('"line1\rline2"');
  });
});

describe("csvRow", () => {
  it("joins escaped fields with commas and CRLF", () => {
    expect(csvRow(["2026-11-15", "expense", "Food, Drink", "12.50"])).toBe(
      '2026-11-15,expense,"Food, Drink",12.50\r\n'
    );
  });

  it("handles an empty row", () => {
    expect(csvRow([])).toBe("\r\n");
  });
});

describe("csvBom", () => {
  it("is the UTF-8 BOM for Excel compatibility", () => {
    expect(csvBom()).toBe("\uFEFF");
  });
});
