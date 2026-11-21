import { appendFileSync, existsSync, readFileSync } from "node:fs";

// Writes a per-test summary (pass rate, failures, full list) to the GitHub
// Actions job summary.
// Usage: node scripts/ci-summary.mjs <vitest|playwright> <report.json> [label]
// label overrides the heading (e.g. "Integration" for a second vitest report).
const [kind, file, label] = process.argv.slice(2);
const heading = label ?? (kind === "vitest" ? "Unit" : "E2E");

function emit(md) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, md + "\n");
  } else {
    console.log(md);
  }
}

function esc(value) {
  return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

function firstLine(value, max = 300) {
  const line = String(value ?? "").split("\n")[0];
  return line.length > max ? line.slice(0, max) + "…" : line;
}

function annotate(name, message) {
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::error title=Test failed::${esc(name)} — ${esc(firstLine(message))}`);
  }
}

function fromVitest(report) {
  const rows = [];
  const failures = [];
  for (const fileResult of report.testResults ?? []) {
    for (const t of fileResult.assertionResults ?? []) {
      const name = t.fullName || t.title;
      rows.push({ name, status: t.status });
      if (t.status === "failed") {
        failures.push({ name, message: (t.failureMessages ?? []).join("\n") });
      }
    }
  }
  return {
    total: report.numTotalTests ?? 0,
    passed: report.numPassedTests ?? 0,
    failed: report.numFailedTests ?? 0,
    skipped: report.numPendingTests ?? 0,
    flaky: 0,
    rows,
    failures,
  };
}

function fromPlaywright(report) {
  const stats = report.stats ?? {};
  const rows = [];
  const failures = [];
  const walk = (suite, trail) => {
    const name = [...trail, suite.title].filter(Boolean);
    for (const spec of suite.specs ?? []) {
      const full = [...name, spec.title].join(" › ");
      rows.push({ name: full, status: spec.ok ? "passed" : "failed" });
      if (!spec.ok) {
        const message = (spec.tests ?? [])
          .flatMap((t) => (t.results ?? []).map((r) => r.error?.message ?? r.status))
          .filter(Boolean)
          .join("\n");
        failures.push({ name: full, message });
      }
    }
    for (const child of suite.suites ?? []) walk(child, name);
  };
  for (const suite of report.suites ?? []) walk(suite, []);
  const passed = stats.expected ?? 0;
  const failed = stats.unexpected ?? 0;
  const flaky = stats.flaky ?? 0;
  const skipped = stats.skipped ?? 0;
  return { total: passed + failed + flaky + skipped, passed, failed, skipped, flaky, rows, failures };
}

if (!kind || !file || !["vitest", "playwright"].includes(kind)) {
  console.error("Usage: node scripts/ci-summary.mjs <vitest|playwright> <report.json>");
  process.exit(1);
}

if (!existsSync(file)) {
  emit(`## ${heading} tests\n\n⚠️ Report \`${file}\` not found — the test step likely failed before producing results. See the job log.`);
  process.exit(0);
}

const report = JSON.parse(readFileSync(file, "utf8"));
const s = kind === "vitest" ? fromVitest(report) : fromPlaywright(report);
const rate = s.total ? Math.round((s.passed / s.total) * 100) : 0;

let md = `## ${heading} tests\n\n`;
md += `**${s.passed}/${s.total} passed (${rate}%)**`;
if (s.failed) md += ` · ${s.failed} failed`;
if (s.flaky) md += ` · ${s.flaky} flaky`;
if (s.skipped) md += ` · ${s.skipped} skipped`;
md += "\n";

if (s.failures.length) {
  md += "\n| Failed test | Error |\n|---|---|\n";
  for (const f of s.failures) {
    md += `| ${esc(f.name)} | ${esc(firstLine(f.message))} |\n`;
    annotate(f.name, f.message);
  }
}

md += `\n<details><summary>All ${s.rows.length} tests</summary>\n\n`;
md += "| Test | Status |\n|---|---|\n";
for (const r of s.rows) {
  md += `| ${esc(r.name)} | ${r.status === "passed" ? "✅ passed" : "❌ " + esc(r.status)} |\n`;
}
md += "\n</details>\n";

emit(md);
