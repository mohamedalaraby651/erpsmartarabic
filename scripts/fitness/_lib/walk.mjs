import { readdirSync } from "node:fs";
import { resolve } from "node:path";

export function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mts|cts)$/.test(e.name) && !e.name.endsWith(".d.ts"))
      out.push(p);
  }
  return out;
}
