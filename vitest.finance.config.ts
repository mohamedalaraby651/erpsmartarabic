/**
 * Vitest config — UX-2A Wave 8 G1 (Finance Coverage Gate).
 *
 * Scoped to `src/domain/finance/**` with ≥95% thresholds on all four
 * coverage metrics. Public surface barrels and event registry indices are
 * excluded — they re-export only. Test files are excluded from coverage
 * (they're the measurement instrument, not the measured surface).
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
      reporter: ["text", "text-summary", "json-summary"],
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
        branches: 95,
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
