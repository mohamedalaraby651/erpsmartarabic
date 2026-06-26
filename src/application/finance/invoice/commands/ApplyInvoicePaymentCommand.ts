/**
 * ApplyInvoicePaymentCommand — primitive DTO for the ApplyPayment use case.
 *
 * `amountMinor` is integer minor units of `currencyCode`. The handler
 * builds Money + Currency, loads the aggregate, and forwards to
 * `Invoice.applyPayment(amount, clock.now(), idPort.generate())`.
 */
import type { InvoiceId, InvoiceStatus } from "@/domain/finance";

export interface ApplyInvoicePaymentCommand {
  readonly invoiceId: InvoiceId;
  readonly amountMinor: number;
  readonly currencyCode: string;
}

export interface ApplyInvoicePaymentResult {
  readonly invoiceId: InvoiceId;
  /** Aggregate version AFTER the append. */
  readonly newVersion: number;
  /** Derived from the reducer after the payment event was recorded. */
  readonly status: InvoiceStatus;
}
