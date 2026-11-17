"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface AmountInputProps {
  /** Form field name — the raw decimal string is submitted under this name. */
  name: string;
  /** Current decimal value, e.g. "42.50". */
  defaultValue?: string;
  currency?: string;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  label?: string;
  onValueChange?: (decimal: string) => void;
}

/** Turn a raw digit string into a decimal with 2 dp: "5" → "0.05", "5558" → "55.58" */
function formatCents(digits: string): string {
  if (digits === "") return "";
  const padded = digits.padStart(3, "0");
  return padded.slice(0, -2) + "." + padded.slice(-2);
}

/** Turn a decimal string like "42.50" into its raw digits: "4250" */
function decimalToDigits(decimal: string): string {
  const cleaned = decimal.replace(/[^0-9.]/g, "");
  if (cleaned === "") return "";
  const [int, dec = ""] = cleaned.split(".");
  const decPadded = (dec + "00").slice(0, 2);
  return (int + decPadded).replace(/^0+(?=\d)/, "");
}

/**
 * Calculator-style amount input: typing digits fills from the right (cents first).
 * Type 5 → 0.05, type 5 → 0.55, type 5 → 5.55, type 8 → 55.58.
 */
export function AmountInput({
  name,
  defaultValue,
  currency,
  placeholder = "0.00",
  required,
  autoFocus,
  label,
  onValueChange,
}: AmountInputProps) {
  const [digits, setDigits] = useState(() =>
    defaultValue ? decimalToDigits(defaultValue) : ""
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const display = formatCents(digits);
  const id = `amount-${name}`;

  const updateDigits = useCallback(
    (newDigits: string) => {
      setDigits(newDigits);
      onValueChange?.(formatCents(newDigits));
    },
    [onValueChange]
  );

  useEffect(() => {
    if (autoFocus) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [autoFocus]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key >= "0" && e.key <= "9") {
      e.preventDefault();
      updateDigits(digits + e.key);
    } else if (e.key === "Backspace") {
      e.preventDefault();
      updateDigits(digits.slice(0, -1));
    } else if (e.key === "Enter") {
      // Let the form submit handler run.
    } else if (
      ["Tab", "Escape", "ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)
    ) {
      // Allow navigation / system keys.
    } else {
      e.preventDefault();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "");
    if (pasted) {
      updateDigits(pasted.replace(/^0+(?=\d)/, ""));
    }
  }

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
          {label}
        </label>
      )}
      <div className={label ? "relative mt-1" : "relative"}>
        {currency && (
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-neutral-400 dark:text-neutral-500">
            {currency}
          </span>
        )}
        <input
          ref={inputRef}
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder={placeholder}
          value={display}
          required={required}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onChange={() => {}} // Controlled — state managed by onKeyDown/onPaste.
          className={`block w-full rounded-xl border border-neutral-300 ${currency ? "pl-14" : "pl-4"} pr-4 py-3 text-lg font-semibold text-neutral-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100`}
        />
      </div>
      {/* Hidden field carries the clean decimal string for form submission. */}
      <input type="hidden" name={name} value={display} autoComplete="off" />
    </div>
  );
}
