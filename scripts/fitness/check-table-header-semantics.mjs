#!/usr/bin/env node
/**
 * check-table-header-semantics.mjs — OPA-UI-001 guard.
 *
 * Prevents the class of defect where a table header row contains an element
 * that is not a table cell. The browser then foster-parents that element out
 * of the table, and the column headers render as a detached stack.
 *
 * Rules enforced:
 *   1. Inside <TableHeader>…</TableHeader>, a <TableRow> may only contain
 *      <TableHead> or components known to render a <th> (DataTableHeader).
 *   2. <TableCell> (a <td>) is not allowed inside <TableHeader>.
 *   3. <SelectItem value=""> is forbidden (Radix rejects empty values).
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");

/** Components that render a <th>. Extend deliberately, never loosely. */
const TH_COMPONENTS = new Set(["TableHead", "DataTableHeader"]);

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) walk(full, acc);
    else if (extname(name) === ".tsx") acc.push(full);
  }
  return acc;
}

const violations = [];

for (const file of walk(SRC)) {
  const src = readFileSync(file, "utf8");
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const lines = src.split("\n");

  // Rule 3 — empty Select option value.
  lines.forEach((line, i) => {
    if (/<SelectItem[^>]*\svalue=(""|''|\{['"]{2}\})/.test(line)) {
      violations.push({ rel, line: i + 1, rule: "empty-select-item", detail: line.trim().slice(0, 100) });
    }
  });

  // Rules 1 & 2 — scan every <TableHeader> … </TableHeader> region.
  let depth = 0;
  let headerStart = 0;
  lines.forEach((line, i) => {
    if (/<TableHeader[\s>]/.test(line)) {
      if (depth === 0) headerStart = i + 1;
      depth++;
    }
    if (depth > 0) {
      if (/<TableCell[\s>/]/.test(line)) {
        violations.push({ rel, line: i + 1, rule: "td-in-thead", detail: `TableCell inside TableHeader (opened line ${headerStart})` });
      }
      const m = line.match(/<([A-Z][A-Za-z0-9_]*)[\s>/]/);
      if (m && !["TableHeader", "TableRow", ...TH_COMPONENTS].includes(m[1])) {
        violations.push({ rel, line: i + 1, rule: "non-cell-in-header-row", detail: `<${m[1]}> directly inside header row (opened line ${headerStart})` });
      }
    }
    if (/<\/TableHeader>/.test(line)) depth = Math.max(0, depth - 1);
  });
}

if (violations.length) {
  console.error(`[check-table-header-semantics] ${violations.length} violation(s):`);
  for (const v of violations) console.error(`  ${v.rel}:${v.line} [${v.rule}] ${v.detail}`);
  process.exit(1);
}
console.log("[check-table-header-semantics] PASS — all table headers use semantic cells");
