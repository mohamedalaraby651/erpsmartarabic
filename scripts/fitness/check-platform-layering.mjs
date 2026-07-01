#!/usr/bin/env node
/**
 * check-platform-layering — UX3A §2
 *
 * Wave 0 mode: REPORT-ONLY. Emits violations to stdout; exit 0 regardless.
 * Wave 1 will flip `MODE = "enforcing"`.
 *
 * Rules (see UX3A-§2):
 *   R1. No back-edges (lower layer never imports upper layer).
 *   R2. `ux/**` bans domain/application/infrastructure/supabase.
 *   R3. `kernel/**` is pure (no React, no DOM, no network, no supabase).
 *   R4. Features import platform only via `@/platform` façades (not deep paths).
 *   R5. `design-system/**` bans ux/platform/features/pages.
 *
 * Wave 0 scope: only report; the target layers may not exist yet. We tolerate
 * missing folders silently.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const MODE = "report-only"; // Wave 0
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const SRC = join(ROOT, "src");

const LAYER_ORDER = [
  "kernel",
  "platform",
  "design-system",
  "ui-contracts",
  "ux",
  "features",
  "pages",
];
const LAYER_INDEX = Object.fromEntries(LAYER_ORDER.map((l, i) => [l, i]));

const FORBIDDEN_FROM_UX = [/^@\/domain\//, /^@\/application\//, /^@\/infrastructure\//, /^@\/integrations\/supabase\//];
const FORBIDDEN_FROM_KERNEL = [/^react(\/|$)/, /^react-dom(\/|$)/, /^@\/integrations\/supabase\//];
const FORBIDDEN_FROM_DS = [/^@\/ux\//, /^@\/platform\//, /^@\/features\//, /^@\/pages\//];

const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name.startsWith(".")) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (EXT.has(extname(name))) out.push(abs);
  }
  return out;
}

function layerOf(absFile) {
  const rel = relative(SRC, absFile).split("\\").join("/");
  const top = rel.split("/")[0];
  return top in LAYER_INDEX ? top : null;
}

const IMPORT_RE = /(?:^|\n)\s*(?:import\s[^;'"]*from\s*|import\s*|export\s[^;'"]*from\s*)['"]([^'"]+)['"]/g;
function importsOf(src) {
  const out = [];
  let m;
  while ((m = IMPORT_RE.exec(src)) !== null) out.push(m[1]);
  return out;
}

const files = walk(SRC);
const violations = [];

for (const abs of files) {
  const layer = layerOf(abs);
  if (!layer) continue;
  const src = readFileSync(abs, "utf8");
  const rel = relative(ROOT, abs).split("\\").join("/");

  for (const spec of importsOf(src)) {
    // R2 UX bans
    if (layer === "ux") {
      for (const rx of FORBIDDEN_FROM_UX)
        if (rx.test(spec)) violations.push({ rel, rule: "R2/ux-purity", spec });
    }
    // R3 Kernel purity
    if (layer === "kernel") {
      for (const rx of FORBIDDEN_FROM_KERNEL)
        if (rx.test(spec)) violations.push({ rel, rule: "R3/kernel-purity", spec });
    }
    // R5 DS purity
    if (layer === "design-system") {
      for (const rx of FORBIDDEN_FROM_DS)
        if (rx.test(spec)) violations.push({ rel, rule: "R5/design-system-purity", spec });
    }
    // R1 no back-edges (only for `@/<layer>/…` imports)
    const m = /^@\/([^/]+)\//.exec(spec);
    if (m) {
      const targetLayer = m[1];
      if (targetLayer in LAYER_INDEX && LAYER_INDEX[targetLayer] > LAYER_INDEX[layer]) {
        violations.push({ rel, rule: "R1/no-back-edge", spec, from: layer, to: targetLayer });
      }
    }
    // R4 features must not deep-import platform
    if (layer === "features" && /^@\/platform\/[^/]+\/.+/.test(spec)) {
      // allow namespaced façades like @/platform/ports and @/platform/dashboard
      const allowed = /^@\/platform\/(ports|dashboard|intelligence)(\/|$)/;
      if (!allowed.test(spec))
        violations.push({ rel, rule: "R4/feature-facade-only", spec });
    }
  }
}

const tag = `[fitness:check-platform-layering][${MODE}]`;
if (violations.length === 0) {
  console.log(`${tag} 0 violations across ${files.length} files`);
  process.exit(0);
}

console.log(`${tag} ${violations.length} violation(s):`);
for (const v of violations.slice(0, 200)) {
  console.log(`  ${v.rule} :: ${v.rel} -> ${v.spec}`);
}
if (violations.length > 200) console.log(`  … and ${violations.length - 200} more`);

process.exit(MODE === "enforcing" ? 1 : 0);
