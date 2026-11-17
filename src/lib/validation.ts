import { z } from "zod";

export const transactionTypeSchema = z.enum(["EXPENSE", "INCOME"]);

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: z
    .string()
    .min(1, "Amount is required")
    .regex(/^\d+(\.\d{1,4})?$/, "Amount must be a positive number with up to 4 decimals"),
  categoryId: z.string().min(1, "Category is required"),
  date: z.string().min(1, "Date is required"),
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
  month: z.string().min(1), // YYYY-MM-01
  limitAmount: z
    .string()
    .min(1)
    .regex(/^\d+(\.\d{1,4})?$/, "Must be a positive number"),
});

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;
export type TransactionFilterInput = z.infer<typeof transactionFilterSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreatePaymentMethodInput = z.infer<typeof createPaymentMethodSchema>;
export type SetBudgetInput = z.infer<typeof setBudgetSchema>;
