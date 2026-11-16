/**
 * RFC 4180 CSV writer. Handles commas, quotes, and newlines in field values.
 */
export function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes("\r")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function csvRow(fields: string[]): string {
  return fields.map(csvEscape).join(",") + "\r\n";
}

export function csvBom(): string {
  return "\uFEFF";
}
