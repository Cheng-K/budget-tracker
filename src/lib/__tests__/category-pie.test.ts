import { describe, it, expect } from "vitest";
import {
  buildCategoryPie,
  OTHER_SLICE_KEY,
  MAX_PIE_SLICES,
  type CategoryPieItem,
} from "@/lib/category-pie";

function item(
  id: string,
  amount: string,
  overrides: Partial<CategoryPieItem> = {}
): CategoryPieItem {
  return {
    categoryId: id,
    name: `Category ${id}`,
    amount,
    count: 1,
    budget: null,
    ...overrides,
  };
}

describe("buildCategoryPie", () => {
  it("returns no slices for empty input", () => {
    expect(buildCategoryPie([], "0")).toEqual([]);
  });

  it("returns no slices when total expenses is zero", () => {
    expect(buildCategoryPie([item("a", "10.00")], "0")).toEqual([]);
  });

  it("maps each category to a slice when at or under the limit", () => {
    const items = [item("a", "60.00", { count: 2, budget: "100" }), item("b", "40.00")];
    const slices = buildCategoryPie(items, "100.00");

    expect(slices).toHaveLength(2);
    expect(slices[0]).toMatchObject({
      key: "a",
      name: "Category a",
      value: 60,
      pct: 60,
      count: 2,
      budget: "100",
      grouped: [],
    });
    expect(slices[1]).toMatchObject({ key: "b", value: 40, pct: 40 });
  });

  it("sorts slices by amount descending regardless of input order", () => {
    const slices = buildCategoryPie(
      [item("small", "10.00"), item("big", "90.00")],
      "100.00"
    );
    expect(slices.map((s) => s.key)).toEqual(["big", "small"]);
  });

  it("keeps exactly MAX_PIE_SLICES slices without an Other when at the limit", () => {
    const items = Array.from({ length: MAX_PIE_SLICES }, (_, i) =>
      item(`c${i}`, `${100 - i}.00`)
    );
    const slices = buildCategoryPie(items, "679.00");
    expect(slices).toHaveLength(MAX_PIE_SLICES);
    expect(slices.some((s) => s.key === OTHER_SLICE_KEY)).toBe(false);
  });

  it("groups the tail into Other with summed amounts and counts", () => {
    const items = Array.from({ length: MAX_PIE_SLICES + 3 }, (_, i) =>
      item(`c${i}`, `${100 - i * 10}.00`, { count: i + 1 })
    );
    const total = items.reduce((n, i) => n + Number(i.amount), 0).toFixed(2);
    const slices = buildCategoryPie(items, total);

    expect(slices).toHaveLength(MAX_PIE_SLICES + 1);
    const other = slices[slices.length - 1];
    expect(other.key).toBe(OTHER_SLICE_KEY);
    expect(other.name).toBe("Other");
    // Tail = c7 (30.00), c8 (20.00), c9 (10.00)
    expect(other.value).toBe(60);
    expect(other.count).toBe(8 + 9 + 10);
    expect(other.budget).toBeNull();
    expect(other.grouped.map((g) => g.categoryId)).toEqual(["c7", "c8", "c9"]);
    expect(other.pct).toBeCloseTo((60 / Number(total)) * 100, 5);
  });

  it("sums grouped amounts with decimal precision", () => {
    const items = [
      ...Array.from({ length: MAX_PIE_SLICES }, (_, i) => item(`big${i}`, "100.00")),
      item("t1", "0.10"),
      item("t2", "0.20"),
    ];
    const slices = buildCategoryPie(items, "700.30");
    const other = slices[slices.length - 1];
    expect(other.value).toBe(0.3);
    expect(other.pct).toBeCloseTo((0.3 / 700.3) * 100, 5);
  });

  it("percentages across all slices sum to 100", () => {
    const items = [item("a", "33.33"), item("b", "66.67")];
    const slices = buildCategoryPie(items, "100.00");
    const sum = slices.reduce((n, s) => n + s.pct, 0);
    expect(sum).toBeCloseTo(100, 5);
  });
});
