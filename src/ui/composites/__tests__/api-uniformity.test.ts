/**
 * API Uniformity contract tests — Composites (Wave 2.5).
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const LAYER = join(process.cwd(), "src/ui/composites");

function walk(dir: string, acc: string[] = []): string[] {
  try {
    for (const name of readdirSync(dir)) {
      if (name.startsWith(".")) continue;
      const full = join(dir, name);
      const s = statSync(full);
      if (s.isDirectory()) {
        if (["__tests__", "__demo__"].includes(name)) continue;
        walk(full, acc);
      } else if (extname(name) === ".tsx") acc.push(full);
    }
  } catch { /* ignore */ }
  return acc;
}

describe("ADR-0029 UI API Uniformity — Composites", () => {
  const files = walk(LAYER);
  it("has at least one composite to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });
});
