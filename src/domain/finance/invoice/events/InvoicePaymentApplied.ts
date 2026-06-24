/**
 * InvoicePaymentApplied — payload-only contract (Wave 4).
 *
 * Behavior (recordPayment / cumulative-paid tracking / PartiallyPaid→Paid
 * transition) is intentionally NOT wired in Wave 4; it lands in Wave 5.
 * Defining the payload now lets the reducer and snapshots be additive in
 * Wave 5 with zero contract churn.
 *
 * Snapshot fields are minor-units integers (R-1106) so replay is
 * arithmetic-free.
 */
import type { InvoiceEvent } from "./InvoiceEvent";

export interface InvoicePaymentAppliedPayload {
  readonly amountMinor: number;
  readonly currencyCode: string;
}

export type InvoicePaymentApplied = InvoiceEvent<
  "InvoicePaymentApplied",
  InvoicePaymentAppliedPayload
>;

export const INVOICE_PAYMENT_APPLIED = "InvoicePaymentApplied" as const;
