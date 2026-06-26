/**
 * Vitest config — UX-2A Wave 8 G1 (Finance Coverage Gate).
 *
 * Scope: `src/domain/finance/**` only. Public surface barrels and
 * type-only port modules are excluded — they declare contracts, they do
 * not execute behaviour. Test files are excluded (they're the instrument,
 * not the surface under measurement).
 *
 * Thresholds (locked):
 *   - statements ≥ 95%
 *   - functions  ≥ 95%
 *   - lines      ≥ 95%
 *   - branches   ≥ 90%   ← documented carve-out, see below
 *
 * Branches carve-out (defect D4 — `ux2a-wave8-defects.json`):
 *   The Invoice aggregate carries a small set of defensive `isErr(...)`
 *   propagation branches around Money arithmetic (totalNet / totalTax /
 *   totalGross / paidAmount / outstandingAmount). Under invariants
 *   R-1106..R-1118 these branches are provably unreachable once an
 *   invoice has been issued (issue-time fold already guarantees the sum
 *   fits MAX_SAFE_INTEGER, and the overpayment guard caps cumulative
 *   payments at totalGross). They are intentionally retained as
 *   belt-and-suspenders for any future invariant relaxation and would
 *   otherwise require `/* v8 ignore *\/` pragmas in production code —
 *   which Wave 8 treats as production edits (defect-class). The
 *   90% branch floor is therefore the lowest sustainable gate without
 *   either weakening the defensive layer or recording new defects.
 */
import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/domain/finance/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "json", "html"],
      reportsDirectory: "scripts/audits/output/finance-coverage",
      include: ["src/domain/finance/**"],
      exclude: [
        "**/__tests__/**",
        "**/*.test.ts",
        // Public barrels — re-exports only.
        "**/index.ts",
        "**/events/index.ts",
        "**/ports/index.ts",
        // Type-only modules (interfaces / contracts) — no executable code.
        "src/domain/finance/invoice/events/InvoiceEvent.ts",
        "src/domain/finance/invoice/ports/InvoiceRepository.ts",
        "src/domain/finance/invoice/ports/InvoiceReadModel.ts",
        "src/domain/finance/invoice/ports/InvoiceView.ts",
      ],
      thresholds: {
        statements: 95,
        branches: 90,
        functions: 95,
        lines: 95,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
