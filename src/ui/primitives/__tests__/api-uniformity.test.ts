/**
 * API Uniformity contract tests — Primitives (Wave 2.5).
 * Uses the same signals as `check-ui-api-uniformity.mjs` but expressed
 * as Vitest assertions. Fails fast in CI even when the fitness runner
 * is in warn mode.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const LAYER = join(process.cwd(), "src/ui/primitives");

function walk(dir: string, acc: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name.startsWith(".")) continue;
    const full = join(dir, name);
    const s = statSync(full);
    if (s.isDirectory()) {
      if (["__tests__", "__demo__", "_internal"].includes(name)) continue;
      walk(full, acc);
    } else if (extname(name) === ".tsx") acc.push(full);
  }
  return acc;
}

describe("ADR-0029 UI API Uniformity — Primitives", () => {
  const files = walk(LAYER);

  it.each(files)("%s — forwardRef requires displayName", (file) => {
    const src = readFileSync(file, "utf8");
    const isForwardRef = /React\.forwardRef|forwardRef\s*[<(]/.test(src);
    if (!isForwardRef) return;
    expect(src, `${file} uses forwardRef without displayName`).toMatch(/\.displayName\s*=\s*["']/);
  });

  it.each(files)("%s — accepts className", (file) => {
    const src = readFileSync(file, "utf8");
    expect(src, `${file} must accept className`).toMatch(/className\s*[?:]/);
  });
});
