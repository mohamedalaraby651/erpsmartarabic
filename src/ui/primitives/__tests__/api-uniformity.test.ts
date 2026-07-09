/**
 * API Uniformity contract tests — Primitives (Wave 2.5).
 *
 * Wave 2.5 opens in warn mode; the enforcing checks live in
 * `scripts/fitness/check-ui-api-uniformity.mjs` under the
 * `CHECK_UI_API_UNIFORMITY_ENFORCE=1` gate. These Vitest cases only
 * assert layer presence + `forwardRef → displayName` (the one rule that
 * is already 100% in shape).
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

describe("ADR-0029 UI API Uniformity — Primitives (Wave 2.5 warn)", () => {
  const files = walk(LAYER);

  it("has primitives to check", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s — forwardRef requires displayName", (file) => {
    const src = readFileSync(file, "utf8");
    const isForwardRef = /React\.forwardRef|forwardRef\s*[<(]/.test(src);
    if (!isForwardRef) return;
    expect(src, `${file} uses forwardRef without displayName`).toMatch(/\.displayName\s*=\s*["']/);
  });
});
