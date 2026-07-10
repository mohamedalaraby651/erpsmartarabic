#!/usr/bin/env node
/**
 * token-coverage.mjs — Wave 2 Closure Phase E.
 * Reports the proportion of tokenized vs. hardcoded usages per axis.
 */
import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from "node:fs";
import { join, extname, relative } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src");
const OUT = join(ROOT, "scripts/audits/output/wave2-discovery");
const EXTS = new Set([".ts", ".tsx", ".css"]);
const EXCLUDE = ["src/kernel", "src/platform", "src/ui/tokens"];
const walk = (d, a = []) => {
  for (const n of readdirSync(d)) {
    if (n.startsWith(".")) continue;
    const f = join(d, n), rel = relative(ROOT, f).replace(/\\/g, "/");
    if (EXCLUDE.some((p) => rel === p || rel.startsWith(p + "/"))) continue;
    if (rel.includes("__tests__")) continue;
    const s = statSync(f);
    if (s.isDirectory()) walk(f, a);
    else if (EXTS.has(extname(n)) && rel !== "src/index.css") a.push(rel);
  }
  return a;
};

const AXES = {
  colors:      { token: /var\(--(?:primary|secondary|background|foreground|muted|accent|destructive|border|input|ring|card|popover|success|warning|info|surface-\d)/g, raw: /#[0-9a-fA-F]{3,8}\b|rgb\(/g },
  typography:  { token: /var\(--font-sans\)/g, raw: /font-family\s*:/gi },
  spacing:     { token: /\b[pm][trblxy]?-\d+\b|\bgap-\d+\b/g, raw: /\b[pm][trblxy]?-\[\d+px\]|\bgap-\[\d+px\]/g },
  elevation:   { token: /var\(--shadow-/g, raw: /box-shadow\s*:\s*(?!var\()/gi },
  motion:      { token: /var\(--ease-|var\(--duration-/g, raw: /transition\s*:\s*[^;]*\d+ms/gi },
  radius:      { token: /var\(--radius\)|rounded-(?:sm|md|lg|xl|2xl|full)/g, raw: /border-radius\s*:\s*\d+px/gi },
  border:      { token: /var\(--border\)|border-border/g, raw: /border-color\s*:\s*#/gi },
  opacity:     { token: /\bopacity-\d+\b/g, raw: /opacity\s*:\s*0?\.\d+/gi },
  transitions: { token: /\btransition-\w+/g, raw: /transition\s*:\s*[^;]/gi },
  zindex:      { token: /\bz-\d+\b/g, raw: /z-index\s*:\s*-?\d+/gi },
  focusRing:   { token: /var\(--shadow-focus\)|ring-ring|ring-\d+/g, raw: /outline\s*:\s*\d+px/gi },
};

const counts = Object.fromEntries(Object.keys(AXES).map((k) => [k, { token: 0, raw: 0 }]));
for (const rel of walk(SRC)) {
  const src = readFileSync(join(ROOT, rel), "utf8");
  for (const [axis, { token, raw }] of Object.entries(AXES)) {
    counts[axis].token += (src.match(token) || []).length;
    counts[axis].raw   += (src.match(raw) || []).length;
  }
}

const report = { generatedAt: new Date().toISOString(), axes: {} };
for (const [axis, c] of Object.entries(counts)) {
  const total = c.token + c.raw;
  const coverage = total === 0 ? 1 : c.token / total;
  report.axes[axis] = { ...c, coverage: Number((coverage * 100).toFixed(1)) };
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "token-coverage.json"), JSON.stringify(report, null, 2));
console.log("[token-coverage] " + Object.entries(report.axes).map(([k, v]) => `${k}=${v.coverage}%`).join(" "));
