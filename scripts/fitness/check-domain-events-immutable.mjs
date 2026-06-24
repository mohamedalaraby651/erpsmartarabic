#!/usr/bin/env node
/**
 * Fitness — Domain Events Immutability (ADR-0011 §6, Wave 5).
 *
 * Every property declared inside a `*Payload` interface or an `InvoiceEvent`
 * /`DomainEvent` derived type inside `src/domain/**\/events/**` MUST be
 * `readonly`. Free-form mutable fields would silently bypass the
 * `freezeEvent` runtime guarantee and corrupt event-sourced replay.
 *
 * Heuristic AST-lite: parse `interface ... { ... }` blocks under any
 * `events/` directory; flag property declarations missing the `readonly`
 * modifier. Method signatures and index signatures are ignored.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { walk } from "./_lib/walk.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const DOMAIN_ROOT = resolve(ROOT, "src/domain");
const OUT = resolve(
  __dirname,
  "../audits/output/fitness/check-domain-events-immutable.json",
);

const TEST_RE = /\/(__tests__|__integration__|__mocks__)\//;
const EVENTS_RE = /\/events\//;

// Capture `interface Name { ...body... }` (balanced braces, depth 1).
function extractInterfaceBodies(code) {
  const out = [];
  const re = /\binterface\s+([A-Za-z_$][\w$]*)\s*(?:extends[^{]*)?\{/g;
  let m;
  while ((m = re.exec(code)) !== null) {
    const start = re.lastIndex;
    let depth = 1;
    let i = start;
    while (i < code.length && depth > 0) {
      const c = code[i];
      if (c === "{") depth++;
      else if (c === "}") depth--;
      i++;
    }
    out.push({ name: m[1], body: code.slice(start, i - 1) });
  }
  return out;
}

const PROP_LINE_RE = /^\s*(?:\/\/.*)?$/;
const READONLY_RE = /^\s*readonly\s+/;
// Bare property: identifier (optional `?`) followed by `:`.
const PROP_DECL_RE = /^\s*[A-Za-z_$][\w$]*\??\s*:/;
// Skip method shorthand `name(args): ...`
const METHOD_DECL_RE = /^\s*[A-Za-z_$][\w$]*\??\s*\(/;

const violations = [];
let scannedFiles = 0;

for (const f of walk(DOMAIN_ROOT)) {
  const rel = relative(ROOT, f).split(sep).join("/");
  if (TEST_RE.test("/" + rel)) continue;
  if (!EVENTS_RE.test("/" + rel)) continue;
  scannedFiles++;
  const code = readFileSync(f, "utf8");

  for (const { name, body } of extractInterfaceBodies(code)) {
    // Strip nested braces (object types) — replace with placeholders so we
    // don't drill into nested anonymous object property lists.
    const flat = body.replace(/\{[^{}]*\}/g, "{}");
    const lines = flat.split(/\r?\n/);
    for (const raw of lines) {
      if (PROP_LINE_RE.test(raw)) continue;
      if (METHOD_DECL_RE.test(raw)) continue;
      if (!PROP_DECL_RE.test(raw)) continue;
      if (READONLY_RE.test(raw)) continue;
      violations.push({
        file: rel,
        interface: name,
        line: raw.trim(),
        why: "event payload field must be declared `readonly`",
      });
    }
  }
}

violations.sort(
  (a, b) => a.file.localeCompare(b.file) || a.line.localeCompare(b.line),
);

const report = {
  schemaVersion: 1,
  fitness: "check-domain-events-immutable",
  adr: "ADR-0011",
  scannedFiles,
  violations,
  pass: violations.length === 0,
};
mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
const status = report.pass ? "PASS" : "FAIL";
console.log(
  `[fitness:domain-events-immutable] ${status} — scanned=${scannedFiles} violations=${violations.length}`,
);
if (!report.pass) {
  for (const v of violations)
    console.log(`  ${v.file} [${v.interface}] — ${v.line}`);
  process.exit(1);
}
