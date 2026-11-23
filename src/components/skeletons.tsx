const CARD =
  "rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900";

export function StatsRowSkeleton() {
  return (
    <div className={`${CARD} px-4 py-4`}>
      <div className="h-3 w-8 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-1 h-8 w-36 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-3 flex flex-col gap-2 border-t border-neutral-100 dark:border-neutral-800 pt-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="h-3.5 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className={`mt-3 divide-y divide-neutral-100 dark:divide-neutral-800 overflow-hidden ${CARD}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center justify-between px-4 py-3">
          <div className="flex flex-col gap-1.5">
            <div className="h-3.5 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-3 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          </div>
          <div className="h-3.5 w-14 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="flex flex-col gap-1.5">
          <div className="h-3 w-20 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        </div>
      ))}
      <div className="h-10 w-full animate-pulse rounded-lg bg-neutral-200 dark:bg-neutral-800" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="mt-3 flex h-48 items-end gap-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4">
      {[40, 65, 50, 80, 55, 70, 45, 85, 60, 75, 50, 68].map((h, i) => (
        <div
          key={i}
          className="flex-1 animate-pulse rounded-t bg-neutral-200 dark:bg-neutral-800"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className={`p-4 ${CARD}`}>
      <div className="h-4 w-32 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-3 h-8 w-24 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="mt-4 flex flex-col gap-2">
        <div className="h-3 w-full animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    </div>
  );
}
