/**
 * InvoiceDomainError — Discriminated Union (ADR-0011 §6 + Amendment A2/A2-bis).
 *
 * Wave 6 lock: this union is the SOLE shape returned by the Invoice
 * aggregate for domain-level guard failures.
 *
 * Hard contract:
 *  - NO `message` field anywhere. Errors are machine-typed; presentation
 *    text is a UI concern, not a domain concern.
 *  - Every variant is fully `readonly`.
 *  - Every variant carries a `kind` discriminator referencing the
 *    invariant code (see ADR-0011 §2 R-11xx) — see the table at the bottom.
 *
 * Backward compatibility: `Invoice.ts` re-exports this type, so existing
 * consumers (`import { InvoiceDomainError } from ".../Invoice"`) keep
 * working unchanged.
 */
import type { InvoiceStatus } from "../statusOf";

export type InvoiceDomainError =
  | { readonly kind: "EmptyInvoice" }
  | {
      readonly kind: "InvalidStateTransition";
      readonly from: InvoiceStatus;
      readonly to: InvoiceStatus;
    }
  | {
      readonly kind: "LineCurrencyMismatch";
      readonly invoiceCurrency: string;
      readonly lineCurrency: string;
    }
  | {
      readonly kind: "StructuralEditLocked";
      readonly status: InvoiceStatus;
      readonly op: "addLine" | "removeLine";
    }
  | { readonly kind: "LineIndexOutOfRange"; readonly index: number }
  // ── Wave 5 — payment guards (L3/L4 order) ────────────────────────────────
  | { readonly kind: "PaymentOnTerminalStatus"; readonly status: InvoiceStatus }
  | {
      readonly kind: "PaymentCurrencyMismatch";
      readonly invoiceCurrency: string;
      readonly paymentCurrency: string;
    }
  | { readonly kind: "NonPositivePayment"; readonly amountMinor: number }
  | {
      readonly kind: "OverPayment";
      readonly attemptedMinor: number;
      readonly outstandingMinor: number;
    }
  // ── Wave 5 — void guards ─────────────────────────────────────────────────
  | { readonly kind: "VoidOnTerminalStatus"; readonly status: InvoiceStatus }
  | {
      readonly kind: "VoidReasonInvalid";
      readonly reason: "Empty" | "TooLong";
      readonly length: number;
    }
  | {
      readonly kind: "RehydrationError";
      readonly reason:
        | "EmptyHistory"
        | "NonMonotonicSequence"
        | "IssuedEventMissing"
        | "DuplicateIssuedEvent"
        | "InvoiceIdMismatch"
        | "IssuedNotFirst"
        | "EventAfterVoid";
    };

/**
 * Exhaustiveness helper. Use in `switch (err.kind) { … default: assertNever(err) }`
 * to force a compile-time error when a new variant is added without handling.
 */
export function assertNever(x: never): never {
  throw new Error(
    `Unhandled InvoiceDomainError variant: ${JSON.stringify(x)}`,
  );
}

/**
 * Rule mapping — kept here so docs and code never drift.
 *
 * | kind                       | ADR-0011 rule(s)        |
 * |----------------------------|-------------------------|
 * | EmptyInvoice               | R-1103                  |
 * | InvalidStateTransition     | R-1105                  |
 * | LineCurrencyMismatch       | R-1101 (currency)       |
 * | StructuralEditLocked       | R-1105 (Draft-only)     |
 * | LineIndexOutOfRange        | R-1102                  |
 * | PaymentOnTerminalStatus    | R-1111                  |
 * | PaymentCurrencyMismatch    | R-1112 step 2           |
 * | NonPositivePayment         | R-1112 step 3           |
 * | OverPayment                | R-1112 step 4 / R-1113  |
 * | VoidOnTerminalStatus       | R-1116                  |
 * | VoidReasonInvalid          | R-1116                  |
 * | RehydrationError           | R-1109 / R-1117 / R-1118|
 */
