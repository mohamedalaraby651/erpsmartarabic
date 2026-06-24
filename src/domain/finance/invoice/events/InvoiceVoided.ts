/**
 * InvoiceVoided — payload-only contract (Wave 5).
 *
 * Carries the normalized free-form `reason` text (L5: trimmed, length 1..240)
 * captured at the moment of voiding. `reasonCode` is a closed taxonomy kept
 * for downstream classification (kept required for Wave-4 stream compatibility).
 *
 * Per ADR-0011 §6 Amendment A2, no event MAY follow an InvoiceVoided in the
 * stream; this constraint is enforced by `Invoice.fromHistory`, not here.
 */
import type { InvoiceEvent } from "./InvoiceEvent";

export type VoidReasonCode =
  | "Duplicate"
  | "Erroneous"
  | "Cancellation"
  | "Other";

export interface InvoiceVoidedPayload {
  readonly reasonCode: VoidReasonCode;
  readonly reason: string;
}

export type InvoiceVoided = InvoiceEvent<"InvoiceVoided", InvoiceVoidedPayload>;

export const INVOICE_VOIDED = "InvoiceVoided" as const;
