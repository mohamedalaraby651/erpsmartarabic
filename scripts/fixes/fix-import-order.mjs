#!/usr/bin/env node
/**
 * fix-import-order.mjs — Wave 2 Closure Phase B (report-only in this phase).
 * Groups: react → external → @/kernel → @/platform → @/ui → @/components → relative.
 * This first cut only reports violations; auto-rewriting import blocks is
 * scheduled behind ADR and after AST tooling is in place.
 */
import { walk, readArgs, writeReport, loadFile, SRC } from "./_lib/common.mjs";

const { write } = readArgs();
const IMPORT_RE = /^import\s+[^;]+?from\s+["']([^"']+)["'];?/gm;
const groupOf = (src) => {
  if (src === "react" || src.startsWith("react/")) return 0;
  if (src.startsWith("@/kernel")) return 2;
  if (src.startsWith("@/platform")) return 3;
  if (src.startsWith("@/ui")) return 4;
  if (src.startsWith("@/components")) return 5;
  if (src.startsWith(".")) return 6;
  return 1;
};

const violations = [];
for (const rel of walk(SRC, new Set([".ts", ".tsx"]))) {
  const src = loadFile(rel);
  const groups = [...src.matchAll(IMPORT_RE)].map((m) => groupOf(m[1]));
  for (let i = 1; i < groups.length; i++) {
    if (groups[i] < groups[i - 1]) { violations.push({ file: rel }); break; }
  }
}

writeReport("fix-import-order.json", { mode: write ? "write" : "dry-run", violations });
console.log(`[fix-import-order] ${violations.length} files with out-of-order imports (report-only)`);
