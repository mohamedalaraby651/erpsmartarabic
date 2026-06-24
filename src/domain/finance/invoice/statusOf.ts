/**
 * statusOf — pure reducer over the Invoice event stream (ADR-0011 §5).
 *
 * Contract:
 *   - Total function over `readonly AnyInvoiceEvent[]`.
 *   - Empty stream  →  "Draft"
 *   - After Issued  →  "Issued"
 *   - After Voided  →  "Void" (terminal)
 *   - After payments: cumulative paid (minor units) compared against the
 *     gross snapshot carried by InvoiceIssued.
 *       cumulative == 0           → unchanged (Issued)
 *       0 < cumulative < gross    → "PartiallyPaid"
 *       cumulative >= gross       → "Paid" (terminal)
 *
 * No exceptions, no I/O, no Money instances created — pure integer math
 * over snapshot payloads. The Invoice aggregate uses this reducer for both
 * live state queries and replay.
 */
import type { AnyInvoiceEvent } from "./events";

export type InvoiceStatus =
  | "Draft"
  | "Issued"
  | "PartiallyPaid"
  | "Paid"
  | "Void";

export function statusOf(events: readonly AnyInvoiceEvent[]): InvoiceStatus {
  let status: InvoiceStatus = "Draft";
  let grossMinor = 0;
  let paidMinor = 0;

  for (const ev of events) {
    if (status === "Void" || status === "Paid") {
      // Terminal: any further event in the stream is treated as a no-op
      // for the purposes of state derivation. (Invariant enforcement that
      // prevents emitting such events lives in the aggregate, not here.)
      continue;
    }
    switch (ev.type) {
      case "InvoiceIssued":
        status = "Issued";
        grossMinor = ev.payload.totalGrossMinor;
        break;
      case "InvoicePaymentApplied":
        if (status !== "Issued" && status !== "PartiallyPaid") break;
        paidMinor += ev.payload.amountMinor;
        status = paidMinor >= grossMinor ? "Paid" : "PartiallyPaid";
        break;
      case "InvoiceVoided":
        status = "Void";
        break;
    }
  }
  return status;
}
