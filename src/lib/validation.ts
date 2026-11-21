import { z } from "zod";

export const transactionTypeSchema = z.enum(["EXPENSE", "INCOME"]);

const amountSchema = z
  .string()
  .min(1, "Amount is required")
  .regex(/^\d+(\.\d{1,4})?$/, "Amount must be a positive number with up to 4 decimals");

// V8 rolls overflow dates over (2026-02-31 → Mar 3), so shape alone is not
// enough — round-trip through Date to reject non-existent calendar dates.
export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
  .refine((s) => {
    const d = new Date(s + "T00:00:00Z");
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, "Invalid calendar date");

// Accepts "YYYY-MM" (month key) or "YYYY-MM-01" (first-of-month date).
export const monthStringSchema = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])(-01)?$/, "Month must be YYYY-MM or YYYY-MM-01");

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: amountSchema,
  categoryId: z.string().min(1, "Category is required"),
  date: dateStringSchema,
  note: z.string().max(500).optional().or(z.literal("")),
  paymentMethodId: z.string().min(1, "Payment method is required"),
  locationLabel: z.string().max(200).optional().or(z.literal("")),
  lat: z.string().optional().or(z.literal("")),
  lng: z.string().optional().or(z.literal("")),
  receiptId: z.string().optional().or(z.literal("")),
  recurringTemplateId: z.string().optional(),
  occurrenceDate: z.string().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionFilterSchema = z.object({
  q: z.string().optional(),
  type: transactionTypeSchema.optional(),
  categoryId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  amountMin: z.string().optional(),
  amountMax: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  kind: z.enum(["EXPENSE", "INCOME"]),
  icon: z.string().max(50).optional(),
});

export const updateCategorySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  isHidden: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export const reorderCategoriesSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const createPaymentMethodSchema = z.object({
  name: z.string().min(1).max(50),
});

export const updatePaymentMethodSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(50).optional(),
  isHidden: z.boolean().optional(),
});

export const reorderPaymentMethodsSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export const setBudgetSchema = z.object({
  categoryId: z.string().min(1),
  month: monthStringSchema,
  limitAmount: z
    .string()
    .min(1)
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a positive number"),
});

export const createTemplateSchema = z
  .object({
    type: transactionTypeSchema,
    amount: amountSchema,
    categoryId: z.string().min(1, "Category is required"),
    frequency: z.enum(["WEEKLY", "MONTHLY", "YEARLY"]),
    startDate: dateStringSchema,
    endDate: dateStringSchema.optional().or(z.literal("")),
    note: z.string().max(500).optional().or(z.literal("")),
    paymentMethodId: z.string().min(1, "Payment method is required"),
  })
  .refine((d) => !d.endDate || d.endDate >= d.startDate, {
    message: "End date must be on or after start date",
    path: ["endDate"],
  });

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type SetBudgetInput = z.infer<typeof setBudgetSchema>;
export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;
