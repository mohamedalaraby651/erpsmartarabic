/**
 * Finance bounded context — SOLE public surface (ADR-0011 + Wave 6 A3).
 *
 * Hard rule (enforced by `check-domain-api-stability`):
 *   Any consumer OUTSIDE `src/domain/finance/**` MUST import from
 *   `@/domain/finance` ONLY. Deep imports such as
 *   `@/domain/finance/invoice/Invoice` are forbidden.
 *
 * The internal reducer (`statusOf`), test helpers, freeze helpers, and
 * raw event factories are intentionally NOT re-exported.
 *
 * BigInt boundary (C3): no symbol exported below carries a `bigint` field.
 * `Money.amount` is `number` (safe integer) inside the aggregate; on the
 * read side it crosses as `MoneyView.minor: string`.
 */

// ── Shared value objects ────────────────────────────────────────────────
export { Currency } from "./shared/Currency";
export type { CurrencyCode, CurrencyDomainError } from "./shared/Currency";

export { Money } from "./shared/Money";
export type { MoneyDomainError } from "./shared/Money";

export { TaxRate } from "./shared/TaxRate";
export type { TaxRateDomainError } from "./shared/TaxRate";

// ── Invoice aggregate ───────────────────────────────────────────────────
export { Invoice } from "./invoice/Invoice";
export type {
  InvoiceCreateProps,
  InvoiceError,
  CustomerId,
} from "./invoice/Invoice";
export type { InvoiceStatus } from "./invoice/statusOf";

export { InvoiceNumber } from "./invoice/InvoiceNumber";
export type { InvoiceNumberDomainError } from "./invoice/InvoiceNumber";

export type { InvoiceId } from "./invoice/InvoiceId";

export { InvoiceLine } from "./invoice/InvoiceLine";
export type {
  InvoiceLineProps,
  InvoiceLineError,
} from "./invoice/InvoiceLine";

// ── Errors (discriminated union) ────────────────────────────────────────
export type { InvoiceDomainError } from "./invoice/errors/InvoiceDomainError";
export { assertNever } from "./invoice/errors/InvoiceDomainError";

// ── Events (read-only types + brand constants) ──────────────────────────
export type {
  AnyInvoiceEvent,
  InvoiceEvent,
  InvoiceIssued,
  InvoiceIssuedPayload,
  InvoicePaymentApplied,
  InvoicePaymentAppliedPayload,
  InvoiceVoided,
  InvoiceVoidedPayload,
  VoidReasonCode,
  DomainEventId,
} from "./invoice/events";
export {
  INVOICE_ISSUED,
  INVOICE_PAYMENT_APPLIED,
  INVOICE_VOIDED,
} from "./invoice/events";

// ── Ports (UX-2B integration surface) ───────────────────────────────────
export type {
  InvoiceRepository,
  InvoiceReadModel,
  InvoiceListQuery,
  InvoiceView,
  InvoiceLineView,
  MoneyView,
} from "./invoice/ports";
