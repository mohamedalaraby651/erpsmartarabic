#!/usr/bin/env node
/**
 * Fitness — Application Purity (UX-2B Wave 1).
 *
 * Scope: `src/application/finance/**` production code (tests excluded).
 *
 * The application layer is the BOUNDARY between the pure domain and the
 * dirty world. It orchestrates use cases — it does NOT perform I/O, it
 * does NOT mint identities or read the clock directly, and it does NOT
 * leak adapter / kernel error types past its public surface.
 *
 * Banned in production application code:
 *   - `new Date(` / `Date.now(` / `performance.now(`   → use ClockPort
 *   - `crypto.randomUUID` / `Math.random` / `uuid` / `nanoid` → use IdPort
 *   - Browser globals: window, document, localStorage, sessionStorage, navigator
 *   - HTTP / DB: `@supabase/*`, `await fetch(`, `axios`, `ky`
 *   - `throw new Error(`   → handlers return Result, never throw
 *   - Deep domain imports: `from "@/domain/finance/<any-subpath>"`
 *     (the SOLE public surface is `from "@/domain/finance"`)
 *   - Sealing the error boundary: handler files MUST NOT mention
 *     `RepositoryFailure` or `InfrastructureFailure` in their export
 *     signature. They translate every such error via
 *     `InvoiceApplicationError` factories.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SCOPE = resolve(ROOT, "src/application/finance");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-application-purity.json",
);
const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;
const HANDLER_RE = /\/handlers\//;

const BANS = [
  { re: /\bnew\s+Date\s*\(/g, why: "raw Date() — use ClockPort" },
  { re: /\bDate\.now\s*\(/g, why: "raw Date.now() — use ClockPort" },
  { re: /\bperformance\.now\s*\(/g, why: "raw performance.now() — use ClockPort" },
  { re: /\bcrypto\.randomUUID\s*\(/g, why: "non-deterministic identity — use IdPort" },
  { re: /\bMath\.random\s*\(/g, why: "non-deterministic — use IdPort" },
  { re: /from\s+["'](uuid|nanoid)["']/g, why: "non-deterministic identity package" },
  { re: /\bwindow\./g, why: "browser global: window" },
  { re: /\bdocument\./g, why: "browser global: document" },
  { re: /\blocalStorage\b/g, why: "browser global: localStorage" },
  { re: /\bsessionStorage\b/g, why: "browser global: sessionStorage" },
  { re: /\bnavigator\./g, why: "browser global: navigator" },
  { re: /from\s+["']@supabase\/[^"']+["']/g, why: "infrastructure import (@supabase)" },
  { re: /from\s+["'](axios|ky)["']/g, why: "infrastructure HTTP client" },
  { re: /\bawait\s+fetch\s*\(/g, why: "raw fetch() in application layer" },
  { re: /\bthrow\s+new\s+\w*Error\s*\(/g, why: "handlers must not throw — return Result" },
  {
    re: /from\s+["']@\/domain\/finance\/[^"']+["']/g,
    why: "deep domain import — use `from \"@/domain/finance\"`",
  },
  {
    re: /from\s+["'](?:\.\.\/)+domain\/finance\/[^"']+["']/g,
    why: "deep domain relative import — use `from \"@/domain/finance\"`",
  },
];

// Tokens forbidden in HANDLER files ONLY — they prove the boundary is sealed.
const HANDLER_BANS = [
  {
    re: /\bRepositoryFailure\b/,
    why: "handler leaks RepositoryFailure — translate via fromRepositoryFailure",
  },
  {
    re: /\bInfrastructureFailure\b/,
    why: "handler leaks InfrastructureFailure — translate at boundary",
  },
];

const violations = [];
let scannedFiles = 0;

for (const f of walk(SCOPE)) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (TEST_RE.test("/" + rel)) continue;
  if (!/\.tsx?$/.test(rel)) continue;
  scannedFiles++;
  const code = readFileSync(f, "utf8");
  const lines = code.split("\n");

  for (const { re, why } of BANS) {
    re.lastIndex = 0;
    for (const m of code.matchAll(re)) {
      const before = code.slice(0, m.index);
      const ln = before.split("\n").length;
      const src = (lines[ln - 1] ?? "").trim();
      if (src.startsWith("//") || src.startsWith("*") || src.startsWith("/*")) {
        continue;
      }
      violations.push({ file: rel, line: ln, why, snippet: src.slice(0, 200) });
    }
  }

  if (HANDLER_RE.test("/" + rel)) {
    for (const { re, why } of HANDLER_BANS) {
      for (let i = 0; i < lines.length; i++) {
        const src = lines[i] ?? "";
        const trimmed = src.trim();
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;
        if (re.test(src)) {
          violations.push({
            file: rel,
            line: i + 1,
            why,
            snippet: trimmed.slice(0, 200),
          });
        }
      }
    }
  }
}

violations.sort(
  (a, b) =>
    a.file.localeCompare(b.file) || a.line - b.line || a.why.localeCompare(b.why),
);

const report = {
  schemaVersion: 1,
  fitness: "check-application-purity",
  adr: "UX-2B Wave 1",
  scope: "src/application/finance",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:application-purity] ${status} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations) {
    console.log(`  ${v.file}:${v.line} — ${v.why}  «${v.snippet}»`);
  }
  process.exit(1);
}
