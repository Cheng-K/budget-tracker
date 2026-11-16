"use client";

import { useState, useRef } from "react";

interface ReceiptUploadProps {
  currentReceiptId?: string | null;
  onUploaded: (receiptId: string) => void;
}

export function ReceiptUpload({ currentReceiptId, onUploaded }: ReceiptUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(
    currentReceiptId ? `/api/receipts/${currentReceiptId}` : null
  );
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation.
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Only JPEG, PNG, and WebP images are allowed");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      setError("File must be under 4MB");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.set("file", file);

      const res = await fetch("/api/receipts", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      setPreview(`/api/receipts/${data.receiptId}`);
      onUploaded(data.receiptId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">
        Receipt <span className="text-neutral-400 dark:text-neutral-500">(optional)</span>
      </label>

      {preview ? (
        <div className="mt-1 flex items-start gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Receipt preview"
            className="h-20 w-20 rounded-lg border border-neutral-200 dark:border-neutral-800 object-cover"
          />
          <button
            type="button"
            onClick={() => {
              setPreview(null);
              onUploaded("");
              if (inputRef.current) inputRef.current.value = "";
            }}
            className="text-xs text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      ) : (
        <div className="mt-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFile}
            disabled={uploading}
            className="block w-full text-sm text-neutral-500 dark:text-neutral-400 dark:text-neutral-500 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-emerald-700 hover:file:bg-emerald-100"
          />
          {uploading && (
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 dark:text-neutral-500">Uploading…</p>
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-red-600">{error}</p>
      )}
    </div>
  );
}
