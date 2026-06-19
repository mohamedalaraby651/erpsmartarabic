#!/usr/bin/env node
/**
 * Build a deterministic `tokens.json` from the design-token TypeScript
 * source. This JSON becomes the cross-platform source for Figma / Mobile /
 * React Native / Email-template tooling, so TypeScript is not the only
 * place tokens live.
 *
 * Output: src/ui/tokens/tokens.json (sorted keys, 2-space indent, trailing
 *         newline).
 */
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC = resolve(ROOT, "src/ui/tokens/index.ts");
const OUT = resolve(ROOT, "src/ui/tokens/tokens.json");

function sortKeysDeep(value) {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortKeysDeep(value[key]);
    return out;
  }
  return value;
}

async function main() {
  const mod = await import(pathToFileURL(SRC).href);
  const payload = {
    $schema: "https://design-tokens.github.io/community-group/format/",
    version: mod.TOKEN_VERSION,
    tokens: sortKeysDeep(mod.tokens),
  };
  writeFileSync(OUT, JSON.stringify(payload, null, 2) + "\n");
  console.log(`[tokens:export] wrote ${OUT}`);
}

main().catch((err) => {
  console.error("[tokens:export] failed:", err);
  process.exit(1);
});
