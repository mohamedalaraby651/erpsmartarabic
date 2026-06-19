/**
 * Invoices — deterministic mock dataset — UX-1E.
 *
 * @canonicalState Spike
 * @since UX-1E
 */
import { mulberry32, pick, rngInt, seededId, seededIsoDate, SEED } from "./seed";

export type InvoiceStatus = "draft" | "sent" | "paid" | "overdue" | "cancelled";

export interface MockInvoice {
  readonly id: string;
  readonly number: string;
  readonly customerId: string;
  readonly amount: number;
  readonly status: InvoiceStatus;
  readonly issuedAt: string;
  readonly dueAt: string;
}

const STATUSES: InvoiceStatus[] = ["draft", "sent", "paid", "overdue", "cancelled"];

export function buildInvoices(count = 500, seed = SEED + 1): MockInvoice[] {
  const rng = mulberry32(seed);
  const rows: MockInvoice[] = [];
  for (let i = 1; i <= count; i++) {
    const issued = -rngInt(rng, 0, 540);
    rows.push({
      id: seededId("invoice", i),
      number: `INV-${String(i).padStart(6, "0")}`,
      customerId: seededId("customer", rngInt(rng, 1, 200)),
      amount: Math.round(rng() * 50000) / 100,
      status: pick(rng, STATUSES),
      issuedAt: seededIsoDate(issued),
      dueAt: seededIsoDate(issued + rngInt(rng, 7, 60)),
    });
  }
  return rows;
}

export const invoices = buildInvoices();
