#!/usr/bin/env node
/**
 * check-platform-shell-single-entry — UX3A Wave 1, Invariants #5 & #8.
 * `new PlatformRuntime(` and `RuntimeContext.Provider` may appear only inside
 * src/platform/shell/** and src/platform/runtime/** (the runtime file defines
 * RuntimeContext itself; usage as a Provider must be in shell).
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const SRC = join(ROOT, "src");
const EXT = new Set([".ts", ".tsx", ".js", ".jsx"]);

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

const files = walk(SRC);
const violations = [];

const NEW_RUNTIME = /\bnew\s+PlatformRuntime\s*\(/;
const PROVIDER = /\bRuntimeContext\.Provider\b/;

for (const abs of files) {
  const rel = relative(ROOT, abs).split("\\").join("/");
  const inShell = rel.startsWith("src/platform/shell/");
  const inRuntime = rel.startsWith("src/platform/runtime/");
  const src = readFileSync(abs, "utf8");
  if (NEW_RUNTIME.test(src) && !inShell) {
    violations.push(`${rel} :: instantiates PlatformRuntime outside src/platform/shell/**`);
  }
  if (PROVIDER.test(src) && !inShell && !inRuntime) {
    violations.push(`${rel} :: uses RuntimeContext.Provider outside src/platform/shell/**`);
  }
}

const tag = "[fitness:check-platform-shell-single-entry]";
if (violations.length === 0) {
  console.log(`${tag} 0 violations`);
  process.exit(0);
}
console.log(`${tag} ${violations.length} violation(s):`);
for (const v of violations) console.log(`  ${v}`);
process.exit(1);
