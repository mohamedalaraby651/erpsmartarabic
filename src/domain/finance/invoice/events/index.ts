/**
 * Invoice events — discriminated union (the ONLY type rehydration accepts).
 */
export type { InvoiceEvent, DomainEventId } from "./InvoiceEvent";
export type { InvoiceIssued, InvoiceIssuedPayload } from "./InvoiceIssued";
export { INVOICE_ISSUED } from "./InvoiceIssued";
export type {
  InvoicePaymentApplied,
  InvoicePaymentAppliedPayload,
} from "./InvoicePaymentApplied";
export { INVOICE_PAYMENT_APPLIED } from "./InvoicePaymentApplied";
export type {
  InvoiceVoided,
  InvoiceVoidedPayload,
  VoidReasonCode,
} from "./InvoiceVoided";
export { INVOICE_VOIDED } from "./InvoiceVoided";

import type { InvoiceIssued } from "./InvoiceIssued";
import type { InvoicePaymentApplied } from "./InvoicePaymentApplied";
import type { InvoiceVoided } from "./InvoiceVoided";

export type AnyInvoiceEvent =
  | InvoiceIssued
  | InvoicePaymentApplied
  | InvoiceVoided;
