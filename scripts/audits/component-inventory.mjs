#!/usr/bin/env node
// scripts/audits/component-inventory.mjs
// UX-0: Components / hooks inventory + LOC + classification.
import { mkdirSync, writeFileSync, readFileSync, statSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { readdirSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const SRC = resolve(ROOT, "src");
const OUT = resolve(__dirname, "output/component-report.json");

function walk(dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "test" || entry.name === "node_modules") continue;
      walk(p, out);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      out.push(p);
    }
  }
  return out;
}

function classify(rel, code) {
  if (rel.startsWith("hooks/") || /\/use[A-Z]\w+\.tsx?$/.test(rel)) return "hook";
  if (rel.startsWith("lib/repositories/")) return "repository";
  if (rel.startsWith("lib/queries/")) return "query-service";
  if (rel.startsWith("lib/")) return "lib";
  if (rel.startsWith("domain/")) return "domain";
  if (rel.startsWith("integrations/")) return "integration";
  if (rel.startsWith("pages/")) return "page";
  if (rel.startsWith("config/") || rel.startsWith("types/")) return "config";
  if (rel.startsWith("components/ui/") || rel.startsWith("components/ui-kit/")) return "primitive";
  if (/Dialog\.tsx?$/.test(rel) || /Modal\.tsx?$/.test(rel)) return "dialog";
  if (/Form\.tsx?$/.test(rel) || /\/forms\//.test(rel)) return "form";
  if (/Table\.tsx?$/.test(rel) || /Grid\.tsx?$/.test(rel) || /\/tables\//.test(rel)) return "table";
  if (/Chart\.tsx?$/.test(rel) || /\/charts\//.test(rel)) return "chart";
  if (rel.startsWith("components/layout/") || /Layout\.tsx?$/.test(rel) || /Shell\.tsx?$/.test(rel)) return "layout";
  if (rel.startsWith("components/")) return "feature";
  return "other";
}

function countProps(code) {
  // crude: count props in first `interface ...Props {` block
  const m = code.match(/interface\s+\w+Props\s*(?:extends[^{]+)?\{([\s\S]*?)\n\}/);
  if (!m) return 0;
  return m[1].split("\n").filter(l => /^\s*\w+[?:]?\s*:/.test(l)).length;
}

const files = walk(SRC).map(p => relative(ROOT, p)).sort();
const items = [];
let totalLoc = 0;
const byKind = {};

for (const f of files) {
  const abs = resolve(ROOT, f);
  const code = readFileSync(abs, "utf8");
  const loc = code.split("\n").length;
  totalLoc += loc;
  const rel = f.replace(/^src\//, "");
  const kind = classify(rel, code);
  byKind[kind] = (byKind[kind] ?? 0) + 1;
  items.push({ file: f, kind, loc, props: countProps(code) });
}

const oversize = items.filter(i => i.loc > 500).sort((a, b) => b.loc - a.loc);
const over300 = items.filter(i => i.loc > 300).sort((a, b) => b.loc - a.loc);

const tables = items.filter(i => i.kind === "table");
const dialogs = items.filter(i => i.kind === "dialog");
const forms = items.filter(i => i.kind === "form");
const primitives = items.filter(i => i.kind === "primitive");

function avg(arr) { return arr.length ? +(arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(2) : 0; }

const components = items.filter(i => ["feature", "primitive", "dialog", "form", "table", "chart", "layout", "page"].includes(i.kind));
const hooks = items.filter(i => i.kind === "hook");

// competing primitives (ui-kit vs ui)
const uiKit = primitives.filter(i => i.file.includes("components/ui-kit/")).map(i => i.file.split("/").pop().replace(/\.tsx?$/, ""));
const ui = primitives.filter(i => i.file.includes("components/ui/")).map(i => i.file.split("/").pop().replace(/\.tsx?$/, ""));
const competing = uiKit.filter(n => ui.includes(n)).sort();

const report = {
  schemaVersion: 1,
  baselineVersion: "UX-0",
  totalFiles: items.length,
  totalLoc,
  byKind,
  avgComponentLoc: avg(components.map(c => c.loc)),
  avgHookLoc: avg(hooks.map(h => h.loc)),
  avgProps: avg(components.map(c => c.props).filter(p => p > 0)),
  filesOver500: oversize.length,
  filesOver300: over300.length,
  oversizeFiles: oversize.slice(0, 50),
  largeFiles: over300.slice(0, 50),
  inventory: {
    tables: tables.map(t => t.file).sort(),
    dialogs: dialogs.map(t => t.file).sort(),
    forms: forms.map(t => t.file).sort(),
    primitivesUi: ui.sort(),
    primitivesUiKit: uiKit.sort(),
    competingPrimitives: competing,
  },
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(report, null, 2) + "\n");
console.log(`[components] ${items.length} files, ${oversize.length} > 500 LOC → ${OUT}`);
