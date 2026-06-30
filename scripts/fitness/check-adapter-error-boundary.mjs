#!/usr/bin/env node
/**
 * Fitness — Adapter Error Boundary, bidirectional (UX-2B Wave 1.5).
 *
 * The Application ↔ Infrastructure boundary is sealed in BOTH directions:
 *
 *   Direction 1 — Infrastructure → Application  (forbidden)
 *     Adapters must speak ONLY `RepositoryFailure` / `InfrastructureFailure`.
 *     They MUST NOT import application types, must NOT translate to
 *     `InvoiceApplicationError`, must NOT re-implement `isRetryable`,
 *     must NOT `throw` (return Result instead).
 *
 *   Direction 2 — Application → Infrastructure  (forbidden, refinement #3)
 *     Handlers must NOT import infra packages or adapter symbols, even
 *     transitively. This blocks the leak BEFORE any adapter exists, so
 *     the day the first SupabaseInvoiceRepository lands the rule is
 *     already enforced.
 *
 * Today (Wave 1.5) `src/infrastructure/finance/**` is empty — the infra
 * half of the scan is vacuous, but the application-side half is live.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const APP_SCOPE = resolve(ROOT, "src/application");
const INFRA_SCOPE = resolve(ROOT, "src/infrastructure");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-adapter-error-boundary.json",
);

const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;

// ── Direction 1: infra MUST NOT depend on application/domain types ───────
//   + Wave 2A refinement R4: infra MUST NOT import UI either.
//   The Infrastructure layer is therefore bidirectionally sealed against
//   both Application and UI.
const INFRA_BANS = [
  { re: /from\s+["']@\/application\/[^"']+["']/g, why: "infra imports application/**" },
  { re: /from\s+["'](?:\.\.\/)+application\/[^"']+["']/g, why: "infra relative-imports application/**" },
  { re: /\bInvoiceApplicationError\b/g, why: "infra references InvoiceApplicationError" },
  { re: /\bfromRepositoryFailure\b/g, why: "infra calls a translator (must stay in application)" },
  { re: /\bfunction\s+isRetryable\b/g, why: "infra re-implements isRetryable (single source rule)" },
  { re: /\bthrow\s+new\s+\w*Error\s*\(/g, why: "adapters must return Result, not throw" },
  // R4 — UI bans (absolute aliases)
  { re: /from\s+["']@\/components\/[^"']+["']/g, why: "infra imports @/components/** (UI)" },
  { re: /from\s+["']@\/pages\/[^"']+["']/g, why: "infra imports @/pages/** (UI)" },
  { re: /from\s+["']@\/features\/[^"']+["']/g, why: "infra imports @/features/** (UI)" },
  { re: /from\s+["']@\/hooks\/[^"']+["']/g, why: "infra imports @/hooks/** (UI)" },
  { re: /from\s+["']@\/ui\/[^"']+["']/g, why: "infra imports @/ui/** (UI)" },
  // R4 — relative variants
  { re: /from\s+["'](?:\.\.\/)+(?:components|pages|features|hooks|ui)\/[^"']+["']/g, why: "infra relative-imports UI layer" },
  // R4 — symbol-level (catches transitive React usage)
  { re: /from\s+["']react(?:-dom|-router[^"']*)?(?:\/[^"']+)?["']/g, why: "infra imports react/* (UI runtime)" },
  { re: /\buseState\s*[<(]/g, why: "infra uses React useState" },
  { re: /\buseEffect\s*\(/g, why: "infra uses React useEffect" },
  { re: /\buseMemo\s*\(/g, why: "infra uses React useMemo" },
];

// ── Direction 2: application MUST NOT depend on infra/adapter symbols ────
const APP_BANS = [
  { re: /from\s+["']@\/infrastructure\/[^"']+["']/g, why: "application imports @/infrastructure/**" },
  { re: /from\s+["']src\/infrastructure\/[^"']+["']/g, why: "application imports src/infrastructure/**" },
  { re: /from\s+["'](?:\.\.\/)+infrastructure\/[^"']+["']/g, why: "application relative-imports infrastructure/**" },
  { re: /from\s+["']@supabase\/[^"']+["']/g, why: "application imports @supabase/* package" },
  { re: /from\s+["'](pg|postgrest-js|postgrest-cjs|kysely|drizzle-orm)["']/g, why: "application imports a DB driver" },
  // Symbol-level mentions of known adapter types (catches usage even via type-only re-import).
  { re: /\bSupabaseInvoiceRepository\b/g, why: "application references SupabaseInvoiceRepository" },
  { re: /\bEventCodec\b/g, why: "application references EventCodec (infra-only)" },
  { re: /\bPostgrestError\b/g, why: "application references PostgrestError" },
];

const violations = [];
let scannedFiles = 0;

function scan(scope, bans, label) {
  for (const f of walk(scope)) {
    const rel = relative(ROOT, f).split(sep).join("/");
    if (TEST_RE.test("/" + rel)) continue;
    if (!/\.tsx?$/.test(rel)) continue;
    scannedFiles++;
    const code = readFileSync(f, "utf8");
    const lines = code.split("\n");
    for (const { re, why } of bans) {
      re.lastIndex = 0;
      for (const m of code.matchAll(re)) {
        const before = code.slice(0, m.index);
        const ln = before.split("\n").length;
        const src = (lines[ln - 1] ?? "").trim();
        if (src.startsWith("//") || src.startsWith("*") || src.startsWith("/*")) continue;
        violations.push({
          direction: label,
          file: rel,
          line: ln,
          why,
          snippet: src.slice(0, 200),
        });
      }
    }
  }
}

scan(INFRA_SCOPE, INFRA_BANS, "infra→app");
scan(APP_SCOPE, APP_BANS, "app→infra");

violations.sort(
  (a, b) =>
    a.direction.localeCompare(b.direction) ||
    a.file.localeCompare(b.file) ||
    a.line - b.line,
);

const report = {
  schemaVersion: 1,
  fitness: "check-adapter-error-boundary",
  adr: "UX-2B Wave 1.5 / ADR-0012",
  scope: "src/infrastructure + src/application",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:adapter-error-boundary] ${status} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) {
    console.log(`  [${v.direction}] ${v.file}:${v.line} — ${v.why}  «${v.snippet}»`);
  }
  process.exit(1);
}
