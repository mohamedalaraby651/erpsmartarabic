/**
 * InvoiceIssued — emitted exactly once, on the Draft → Issued transition.
 *
 * Snapshot payload (deliberate):
 *   - number, currency, customerId, lines: the full draft contents at the
 *     moment of issuance. Rehydration reconstructs the aggregate from this
 *     event alone (plus any later payment / void events).
 *   - totalGrossMinor + currencyCode: minor-units integer snapshot used by
 *     the reducer to derive PartiallyPaid vs Paid from cumulative payments
 *     without re-running line arithmetic during replay.
 *
 * Payload is treated as VALUE — the aggregate freezes the wrapping event;
 * line VOs are already frozen by InvoiceLine itself.
 */
import type { InvoiceEvent } from "./InvoiceEvent";
import type { InvoiceNumber } from "../InvoiceNumber";
import type { InvoiceLine } from "../InvoiceLine";
import type { Currency } from "../../shared/Currency";
import type { CustomerId } from "../Invoice";

export interface InvoiceIssuedPayload {
  readonly number: InvoiceNumber;
  readonly currency: Currency;
  readonly customerId?: CustomerId;
  readonly lines: readonly InvoiceLine[];
  readonly totalGrossMinor: number;
  readonly currencyCode: string;
}

export type InvoiceIssued = InvoiceEvent<"InvoiceIssued", InvoiceIssuedPayload>;

export const INVOICE_ISSUED = "InvoiceIssued" as const;
