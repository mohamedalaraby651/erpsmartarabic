#!/usr/bin/env node
/**
 * UX-2A Wave 8 G4 — Finance public surface snapshot.
 *
 * Reads `src/domain/finance/index.ts` and produces a stable JSON snapshot
 * of every exported symbol enriched with:
 *   - symbol     : exported name
 *   - kind       : value | type | const
 *   - visibility : "public" (everything reachable from index.ts is public
 *                  by definition — there is no other ingress)
 *   - category   : value-object | aggregate | identity | error | event
 *                  | event-brand | port | view | enum | helper
 *
 * The category is assigned by an explicit table keyed on the symbol name.
 * Unknown symbols cause the audit to FAIL — this forces future surface
 * additions to be classified consciously, not silently absorbed.
 *
 * Output: `scripts/audits/output/ux2a-wave8-surface.json`.
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../..");
const ENTRY = resolve(ROOT, "src/domain/finance/index.ts");
const OUT = resolve(ROOT, "scripts/audits/output/ux2a-wave8-surface.json");

const CATEGORY = {
  // value-objects
  Currency: { kind: "value", category: "value-object" },
  Money: { kind: "value", category: "value-object" },
  TaxRate: { kind: "value", category: "value-object" },
  InvoiceNumber: { kind: "value", category: "value-object" },
  InvoiceLine: { kind: "value", category: "value-object" },
  CurrencyCode: { kind: "type", category: "value-object" },
  InvoiceLineProps: { kind: "type", category: "value-object" },

  // aggregate
  Invoice: { kind: "value", category: "aggregate" },
  InvoiceCreateProps: { kind: "type", category: "aggregate" },

  // identity (branded ids)
  InvoiceId: { kind: "type", category: "identity" },
  CustomerId: { kind: "type", category: "identity" },
  DomainEventId: { kind: "type", category: "identity" },

  // enums
  InvoiceStatus: { kind: "type", category: "enum" },
  VoidReasonCode: { kind: "type", category: "enum" },

  // errors
  InvoiceDomainError: { kind: "type", category: "error" },
  CurrencyDomainError: { kind: "type", category: "error" },
  MoneyDomainError: { kind: "type", category: "error" },
  TaxRateDomainError: { kind: "type", category: "error" },
  InvoiceNumberDomainError: { kind: "type", category: "error" },
  InvoiceLineError: { kind: "type", category: "error" },
  InvoiceError: { kind: "type", category: "error" },

  // events
  AnyInvoiceEvent: { kind: "type", category: "event" },
  InvoiceEvent: { kind: "type", category: "event" },
  InvoiceIssued: { kind: "type", category: "event" },
  InvoiceIssuedPayload: { kind: "type", category: "event" },
  InvoicePaymentApplied: { kind: "type", category: "event" },
  InvoicePaymentAppliedPayload: { kind: "type", category: "event" },
  InvoiceVoided: { kind: "type", category: "event" },
  InvoiceVoidedPayload: { kind: "type", category: "event" },

  // event brand constants
  INVOICE_ISSUED: { kind: "const", category: "event-brand" },
  INVOICE_PAYMENT_APPLIED: { kind: "const", category: "event-brand" },
  INVOICE_VOIDED: { kind: "const", category: "event-brand" },

  // ports
  InvoiceRepository: { kind: "type", category: "port" },
  InvoiceReadModel: { kind: "type", category: "port" },
  InvoiceListQuery: { kind: "type", category: "port" },

  // views (read-side projection types)
  InvoiceView: { kind: "type", category: "view" },
  InvoiceLineView: { kind: "type", category: "view" },
  MoneyView: { kind: "type", category: "view" },

  // helpers
  assertNever: { kind: "value", category: "helper" },
};

const src = readFileSync(ENTRY, "utf8");

// Extract exported identifiers from `export { A, B } from ...` and
// `export type { C, D } from ...`. Multi-line export blocks supported.
const symbols = new Set();
const exportRe = /export\s+(?:type\s+)?\{([\s\S]*?)\}\s+from/g;
let m;
while ((m = exportRe.exec(src)) !== null) {
  for (const part of m[1].split(",")) {
    const name = part.trim().replace(/\s+as\s+\w+$/, "");
    if (name) symbols.add(name);
  }
}

const unknown = [];
const entries = [...symbols].sort().map((symbol) => {
  const meta = CATEGORY[symbol];
  if (!meta) {
    unknown.push(symbol);
    return { symbol, kind: "unknown", visibility: "public", category: "unknown" };
  }
  return { symbol, kind: meta.kind, visibility: "public", category: meta.category };
});

const byCategory = entries.reduce((acc, e) => {
  acc[e.category] = (acc[e.category] ?? 0) + 1;
  return acc;
}, {});

const snapshot = {
  schemaVersion: 1,
  gate: "UX-2A Wave 8 G4",
  entry: "src/domain/finance/index.ts",
  totalSymbols: entries.length,
  byCategory,
  symbols: entries,
  unknown,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, JSON.stringify(snapshot, null, 2) + "\n");

if (unknown.length > 0) {
  console.error(
    `[G4:surface] FAIL — ${unknown.length} unclassified exported symbol(s):`,
  );
  for (const s of unknown) console.error(`  - ${s}`);
  console.error(
    "Add an entry to CATEGORY in scripts/audits/snapshot-finance-surface.mjs",
  );
  process.exit(1);
}

console.log(
  `[G4:surface] PASS — ${entries.length} symbols snapshotted to ${OUT.replace(
    ROOT + "/",
    "",
  )}`,
);
console.log("           by category:", byCategory);
