#!/usr/bin/env node
/**
 * Fitness function — Shell runtime purity (Invariant I1).
 *
 * Files under `src/ui/layout/**`, `src/ui/providers/**`, `src/ui/hooks/**`
 * MUST NOT import or use:
 *   - `@tanstack/react-query`         (data fetching caches)
 *   - `swr`                            (data fetching caches)
 *   - `axios`                          (HTTP client)
 *   - Bare `fetch(` calls              (network in Shell)
 *   - `useQuery` / `useMutation`       (TanStack hooks)
 *
 * Together with `check-shell-isolation.mjs` this codifies SHELL_INVARIANTS I1.
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-shell-runtime-purity.json"
);

const SCAN_DIRS = ["src/ui/layout", "src/ui/providers", "src/ui/hooks"];

const FORBIDDEN = [
  { pattern: /from\s+["']@tanstack\/react-query["']/, why: "data-fetching cache (@tanstack/react-query) in Shell" },
  { pattern: /from\s+["']swr["']/, why: "data-fetching cache (swr) in Shell" },
  { pattern: /from\s+["']axios["']/, why: "HTTP client (axios) in Shell" },
  { pattern: /\bfetch\s*\(/, why: "raw fetch() call in Shell" },
  { pattern: /\buseQuery\s*\(/, why: "TanStack useQuery in Shell" },
  { pattern: /\buseMutation\s*\(/, why: "TanStack useMutation in Shell" },
];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts|cts)$/.test(entry.name) && !entry.name.endsWith(".d.ts"))
      out.push(p);
  }
  return out;
}

const files = SCAN_DIRS.flatMap((d) => walk(resolve(ROOT, d)));
const violations = [];
for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join("/");
  const code = readFileSync(file, "utf8");
  // Strip line comments / block comments to avoid false positives in JSDoc.
  const stripped = code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(stripped)) {
      violations.push({ file: rel, why: rule.why });
    }
  }
}

violations.sort((a, b) => a.file.localeCompare(b.file) || a.why.localeCompare(b.why));

const report = {
  schemaVersion: 1,
  fitness: "check-shell-runtime-purity",
  baselineVersion: "UX-1",
  scannedFiles: files.length,
  violations,
  pass: violations.length === 0,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");

const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:shell-runtime-purity] ${status} — scanned=${files.length} violations=${violations.length}`
);
if (!report.pass) {
  for (const v of violations) console.log(`  ${v.file} — ${v.why}`);
  process.exit(1);
}
