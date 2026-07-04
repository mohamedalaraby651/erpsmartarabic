#!/usr/bin/env node
/**
 * check-kernel-browser-globals — UX3A Wave 1, Invariant #12.
 * Bans browser globals inside src/kernel/**.
 */
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, resolve, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const KERNEL = join(ROOT, "src", "kernel");
const EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);

const BANNED = [
  "window", "document", "navigator", "localStorage", "sessionStorage",
  "fetch", "XMLHttpRequest", "WebSocket", "caches", "indexedDB",
  "location", "history",
];
// Match bare identifiers or globalThis.<name>. Skip inside comments/strings crudely.
function scan(src, banned) {
  const noComments = src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:\\])\/\/[^\n]*/g, "$1")
    .replace(/"(?:\\.|[^"\\])*"/g, "\"\"")
    .replace(/'(?:\\.|[^'\\])*'/g, "''")
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
  const hits = [];
  for (const name of banned) {
    const rx = new RegExp(`(?<![A-Za-z0-9_$.])${name}(?![A-Za-z0-9_$])`, "g");
    const rxGlobal = new RegExp(`globalThis\\.${name}\\b`, "g");
    if (rx.test(noComments) || rxGlobal.test(noComments)) hits.push(name);
  }
  return hits;
}

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const abs = join(dir, name);
    const st = statSync(abs);
    if (st.isDirectory()) walk(abs, out);
    else if (EXT.has(extname(name))) out.push(abs);
  }
  return out;
}

const files = walk(KERNEL);
const violations = [];
for (const abs of files) {
  const src = readFileSync(abs, "utf8");
  const hits = scan(src, BANNED);
  if (hits.length) violations.push({ file: relative(ROOT, abs), banned: hits });
}

const tag = "[fitness:check-kernel-browser-globals]";
if (violations.length === 0) {
  console.log(`${tag} 0 violations across ${files.length} kernel file(s)`);
  process.exit(0);
}
console.log(`${tag} ${violations.length} violation(s):`);
for (const v of violations) console.log(`  ${v.file} :: ${v.banned.join(", ")}`);
process.exit(1);
