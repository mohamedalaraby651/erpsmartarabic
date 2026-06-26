/**
 * InvoiceView — read-side DTO crossing the domain boundary.
 *
 * Wave 6 / C3 contract:
 *   - All monetary amounts use `MoneyView` = `{ minor: string; currency: string }`.
 *     `minor` is ALWAYS a string. This shields downstream serializers from
 *     JSON precision pitfalls and from any potential migration to `bigint`
 *     inside the aggregate without breaking the public surface.
 *   - All identifiers are `string`s on the view (the branded `Id<T>` types
 *     stay inside the aggregate).
 *   - `occurredAt` and `issuedAt` are ISO-8601 strings via `Instant.toISO()`.
 *   - No `Money`, no `Currency`, no `InvoiceLine`, no `bigint` may leak out.
 */
import type { InvoiceStatus } from "../statusOf";

export interface MoneyView {
  readonly minor: string;
  readonly currency: string;
}

export interface InvoiceLineView {
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: MoneyView;
  readonly taxBasisPoints: number;
  readonly lineNet: MoneyView;
  readonly lineTax: MoneyView;
  readonly lineGross: MoneyView;
}

export interface InvoiceView {
  readonly id: string;
  readonly number: string;
  readonly status: InvoiceStatus;
  readonly currency: string;
  readonly customerId?: string;
  readonly issuedAt?: string;
  readonly totalNet: MoneyView;
  readonly totalTax: MoneyView;
  readonly totalGross: MoneyView;
  readonly paid: MoneyView;
  readonly outstanding: MoneyView;
  readonly lines: readonly InvoiceLineView[];
  /** Aggregate version = number of recorded events. */
  readonly version: number;
}
