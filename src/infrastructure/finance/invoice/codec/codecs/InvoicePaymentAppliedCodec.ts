/**
 * InvoicePaymentAppliedCodec — schemaVersion 1 (UX-2B Wave 2A).
 *
 * Wire payload: { amount_minor: int, currency_code: string }
 */
import { ok, err, isErr, unsafeId, Instant } from "@/shared-kernel";
import type { Result, RepositoryFailure } from "@/shared-kernel";
import { INVOICE_PAYMENT_APPLIED } from "@/domain/finance";
import type {
  InvoicePaymentApplied,
  InvoicePaymentAppliedPayload,
} from "@/domain/finance";
import type { EventCodec } from "../EventCodec";
import type { PersistedEventRow } from "../PersistedEventRow";
import { asInt, asObject, asString } from "../decodeHelpers";

const SCHEMA_VERSION = 1 as const;

export const InvoicePaymentAppliedCodecV1: EventCodec<InvoicePaymentApplied> = {
  type: INVOICE_PAYMENT_APPLIED,
  schemaVersion: SCHEMA_VERSION,

  encode(event: InvoicePaymentApplied): PersistedEventRow {
    return {
      event_id: String(event.eventId),
      aggregate_id: String(event.invoiceId),
      sequence: event.sequence,
      type: INVOICE_PAYMENT_APPLIED,
      schema_version: SCHEMA_VERSION,
      payload: {
        amount_minor: event.payload.amountMinor,
        currency_code: event.payload.currencyCode,
      },
      metadata: {},
      occurred_at: event.occurredAt.toISOString(),
    };
  },

  decode(
    row: PersistedEventRow,
  ): Result<InvoicePaymentApplied, RepositoryFailure> {
    const objR = asObject(row.payload, row, "payload");
    if (isErr(objR)) return err(objR.error);
    const p = objR.value;

    const amtR = asInt(p["amount_minor"], row, "payload.amount_minor");
    if (isErr(amtR)) return err(amtR.error);
    const ccR = asString(p["currency_code"], row, "payload.currency_code");
    if (isErr(ccR)) return err(ccR.error);

    const payload: InvoicePaymentAppliedPayload = {
      amountMinor: amtR.value,
      currencyCode: ccR.value,
    };
    const ev: InvoicePaymentApplied = Object.freeze({
      type: INVOICE_PAYMENT_APPLIED,
      eventId: unsafeId<"DomainEvent">(row.event_id),
      invoiceId: unsafeId<"InvoiceId">(row.aggregate_id),
      sequence: row.sequence,
      occurredAt: Instant.fromISOString(row.occurred_at),
      payload,
    });
    return ok(ev);
  },
};
