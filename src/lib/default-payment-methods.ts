export interface DefaultPaymentMethod {
  name: string;
  sortOrder: number;
}

/**
 * Seeded for every new user on first sign-in.
 * Mirrors the historical fixed enum labels so existing exports keep reading the same.
 */
export const DEFAULT_PAYMENT_METHODS: DefaultPaymentMethod[] = [
  { name: "Cash", sortOrder: 0 },
  { name: "Credit Card", sortOrder: 1 },
  { name: "Debit Card", sortOrder: 2 },
  { name: "Bank Transfer", sortOrder: 3 },
  { name: "Digital Wallet", sortOrder: 4 },
  { name: "Other", sortOrder: 5 },
];
