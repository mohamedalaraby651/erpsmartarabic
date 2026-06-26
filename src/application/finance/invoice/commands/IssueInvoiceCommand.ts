/**
 * IssueInvoiceCommand — primitive DTO crossing the application boundary.
 *
 * Hard rules:
 *  - PRIMITIVE inputs only (string, number, branded ids). VO construction
 *    happens INSIDE the handler. Callers (UI/API) never import Currency,
 *    Money, TaxRate, InvoiceNumber, or InvoiceLine.
 *  - `invoiceId` is pre-minted by the caller via `IdPort` so the command
 *    is idempotent at the wire level (the same id ⇒ the same aggregate).
 *  - No floats. All monetary amounts are integer minor units; all tax
 *    rates are integer basis points.
 *  - No optional fields written with `undefined` (exactOptionalPropertyTypes).
 */
import type { InvoiceId, CustomerId } from "@/domain/finance";

export interface IssueInvoiceLineInput {
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly taxBasisPoints: number;
}

export interface IssueInvoiceCommand {
  readonly invoiceId: InvoiceId;
  readonly number: string;
  readonly currencyCode: string;
  readonly customerId?: CustomerId;
  readonly lines: ReadonlyArray<IssueInvoiceLineInput>;
}

export interface IssueInvoiceResult {
  readonly invoiceId: InvoiceId;
  /** Aggregate version AFTER the append (1 for a fresh Issue). */
  readonly newVersion: number;
  readonly status: "Issued";
}
