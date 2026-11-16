import type { CategoryKind } from "@prisma/client";

export interface DefaultCategory {
  name: string;
  kind: CategoryKind;
  icon: string;
  sortOrder: number;
}

/**
 * Seeded for every new user on first sign-in.
 * Kind is fixed per row — a category is either expense or income.
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: "Food & Dining", kind: "EXPENSE", icon: "utensils", sortOrder: 0 },
  { name: "Groceries", kind: "EXPENSE", icon: "shopping-cart", sortOrder: 1 },
  { name: "Rent & Housing", kind: "EXPENSE", icon: "home", sortOrder: 2 },
  { name: "Transport", kind: "EXPENSE", icon: "car", sortOrder: 3 },
  { name: "Utilities", kind: "EXPENSE", icon: "zap", sortOrder: 4 },
  { name: "Entertainment", kind: "EXPENSE", icon: "film", sortOrder: 5 },
  { name: "Health", kind: "EXPENSE", icon: "heart", sortOrder: 6 },
  { name: "Shopping", kind: "EXPENSE", icon: "bag", sortOrder: 7 },
  { name: "Education", kind: "EXPENSE", icon: "book", sortOrder: 8 },
  { name: "Travel", kind: "EXPENSE", icon: "plane", sortOrder: 9 },
  { name: "Other Expense", kind: "EXPENSE", icon: "more", sortOrder: 10 },
  { name: "Salary", kind: "INCOME", icon: "briefcase", sortOrder: 11 },
  { name: "Freelance", kind: "INCOME", icon: "code", sortOrder: 12 },
  { name: "Investments", kind: "INCOME", icon: "trending-up", sortOrder: 13 },
  { name: "Other Income", kind: "INCOME", icon: "plus", sortOrder: 14 },
];
