/**
 * Recurring transaction sweep worker.
 *
 * Runs as a long-lived process in Docker Compose. Materializes all due
 * recurring transactions across all users every hour. The lazy-on-read path
 * in `materializeDueForUser` provides the correctness guarantee — this worker
 * is the completeness backstop for users who don't log in.
 *
 * Usage: npx tsx src/jobs/recurring-sweep.ts
 */
import { materializeAllDue } from "@/lib/recurring";

const INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function sweep() {
  const start = Date.now();
  try {
    const created = await materializeAllDue();
    const elapsed = Date.now() - start;
    console.log(
      `[recurring-sweep] materialized ${created} transactions in ${elapsed}ms`
    );
  } catch (err) {
    console.error("[recurring-sweep] error:", err);
  }
}

async function main() {
  console.log("[recurring-sweep] starting, interval =", INTERVAL_MS / 1000, "s");
  // Run once on startup.
  await sweep();
  // Then on an interval.
  setInterval(sweep, INTERVAL_MS);
}

main().catch((err) => {
  console.error("[recurring-sweep] fatal:", err);
  process.exit(1);
});
