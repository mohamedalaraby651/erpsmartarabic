#!/usr/bin/env node
/**
 * check-port-registry-completeness — UX3A Wave 1, Invariant #9.
 * Every port listed in DECLARED_PORTS must be registered in both
 * PortRegistry.default() and PortRegistry.inMemory().
 */
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..", "..");
const src = readFileSync(resolve(ROOT, "src/platform/ports/PortRegistry.ts"), "utf8");

const declMatch = src.match(/DECLARED_PORTS\s*=\s*\[([^\]]+)\]/);
if (!declMatch) {
  console.error("[fitness:check-port-registry-completeness] DECLARED_PORTS not found");
  process.exit(1);
}
const declared = [...declMatch[1].matchAll(/"(\w+)"/g)].map((m) => m[1]);

function factoryBlock(name) {
  const rx = new RegExp(`static\\s+${name}\\s*\\([^)]*\\)\\s*:\\s*PortRegistry\\s*{([\\s\\S]*?)^\\s*}`, "m");
  const m = src.match(rx);
  return m ? m[1] : "";
}
const defaultBlock = factoryBlock("default");
const memoryBlock = factoryBlock("inMemory");

const violations = [];
for (const port of declared) {
  const rx = new RegExp(`\\b${port}\\s*:`);
  if (!rx.test(defaultBlock)) violations.push(`default() missing: ${port}`);
  if (!rx.test(memoryBlock)) violations.push(`inMemory() missing: ${port}`);
}

const tag = "[fitness:check-port-registry-completeness]";
if (violations.length === 0) {
  console.log(`${tag} 0 violations; ${declared.length} port(s) fully registered`);
  process.exit(0);
}
console.log(`${tag} ${violations.length} violation(s):`);
for (const v of violations) console.log(`  ${v}`);
process.exit(1);
