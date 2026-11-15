import Decimal from "decimal.js";

export type MoneyInput = Decimal | string | number;

/**
 * Parse a user-entered amount into a Decimal.
 * Rejects NaN / negative / > 4 dp on input, not at render time.
 */
export function toDecimal(value: MoneyInput): Decimal {
  if (value instanceof Decimal) return value;
  return new Decimal(String(value));
}

/** Format as a plain string with 2 dp (or custom precision). */
export function formatAmount(value: MoneyInput, fractionDigits = 2): string {
  return toDecimal(value).toFixed(fractionDigits);
}

/** Format for display with the user's currency symbol/code. */
export function formatMoney(
  value: MoneyInput,
  currencyCode: string,
  locale?: string
): string {
  const n = Number(toDecimal(value).toFixed(2));
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currencyCode,
    }).format(n);
  } catch {
    return `${currencyCode} ${formatAmount(value)}`;
  }
}

/** Sum a list of Decimals without ever going through `number`. */
export function sumDecimals(values: MoneyInput[]): Decimal {
  return values.reduce<Decimal>((acc, v) => acc.add(toDecimal(v)), new Decimal(0));
}

/** Difference a - b, as Decimal. */
export function subtractDecimals(a: MoneyInput, b: MoneyInput): Decimal {
  return toDecimal(a).sub(toDecimal(b));
}

/** a < b */
export function isLess(a: MoneyInput, b: MoneyInput): boolean {
  return toDecimal(a).lt(toDecimal(b));
}

/** Zero as Decimal. */
export const ZERO = new Decimal(0);

/**
 * Parse a decimal-ish user input (allows "1,234.56" and "$12.50").
 * Returns null when unparseable.
 */
export function parseUserAmount(raw: string): Decimal | null {
  const cleaned = raw.replace(/[^0-9.,-]/g, "").replace(/,/g, "");
  if (cleaned === "" || cleaned === "-") return null;
  try {
    const d = new Decimal(cleaned);
    return d.isNegative() ? null : d;
  } catch {
    return null;
  }
}
