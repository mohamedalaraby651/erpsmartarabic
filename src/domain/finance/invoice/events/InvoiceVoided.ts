/**
 * InvoiceVoided — payload-only contract (Wave 4).
 *
 * The void() command is wired in Wave 5; the payload and reason taxonomy
 * are locked now so reducer + storage shape don't churn later.
 */
import type { InvoiceEvent } from "./InvoiceEvent";

export type VoidReasonCode =
  | "Duplicate"
  | "Erroneous"
  | "Cancellation"
  | "Other";

export interface InvoiceVoidedPayload {
  readonly reasonCode: VoidReasonCode;
}

export type InvoiceVoided = InvoiceEvent<"InvoiceVoided", InvoiceVoidedPayload>;

export const INVOICE_VOIDED = "InvoiceVoided" as const;
