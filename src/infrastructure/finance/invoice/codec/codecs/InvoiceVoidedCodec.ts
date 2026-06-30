/**
 * InvoiceVoidedCodec — schemaVersion 1 (UX-2B Wave 2A).
 *
 * Wire payload: { reason_code: string, reason: string }
 */
import { ok, err, isErr, unsafeId, Instant } from "@/shared-kernel";
import type { Result, RepositoryFailure } from "@/shared-kernel";
import { INVOICE_VOIDED } from "@/domain/finance";
import type {
  InvoiceVoided,
  InvoiceVoidedPayload,
  VoidReasonCode,
} from "@/domain/finance";
import type { EventCodec } from "../EventCodec";
import type { PersistedEventRow } from "../PersistedEventRow";
import { asObject, asString, decodeFailure } from "../decodeHelpers";

const SCHEMA_VERSION = 1 as const;

const KNOWN: ReadonlySet<VoidReasonCode> = new Set([
  "Duplicate",
  "Erroneous",
  "Cancellation",
  "Other",
]);

export const InvoiceVoidedCodecV1: EventCodec<InvoiceVoided> = {
  type: INVOICE_VOIDED,
  schemaVersion: SCHEMA_VERSION,

  encode(event: InvoiceVoided): PersistedEventRow {
    return {
      event_id: String(event.eventId),
      aggregate_id: String(event.invoiceId),
      sequence: event.sequence,
      type: INVOICE_VOIDED,
      schema_version: SCHEMA_VERSION,
      payload: {
        reason_code: event.payload.reasonCode,
        reason: event.payload.reason,
      },
      metadata: {},
      occurred_at: event.occurredAt.toISOString(),
    };
  },

  decode(row: PersistedEventRow): Result<InvoiceVoided, RepositoryFailure> {
    const objR = asObject(row.payload, row, "payload");
    if (isErr(objR)) return err(objR.error);
    const p = objR.value;

    const codeR = asString(p["reason_code"], row, "payload.reason_code");
    if (isErr(codeR)) return err(codeR.error);
    if (!KNOWN.has(codeR.value as VoidReasonCode))
      return err(
        decodeFailure(row, "payload.reason_code", `unknown:${codeR.value}`),
      );
    const reasonR = asString(p["reason"], row, "payload.reason");
    if (isErr(reasonR)) return err(reasonR.error);

    const payload: InvoiceVoidedPayload = {
      reasonCode: codeR.value as VoidReasonCode,
      reason: reasonR.value,
    };
    const ev: InvoiceVoided = Object.freeze({
      type: INVOICE_VOIDED,
      eventId: unsafeId<"DomainEvent">(row.event_id),
      invoiceId: unsafeId<"InvoiceId">(row.aggregate_id),
      sequence: row.sequence,
      occurredAt: Instant.fromISOString(row.occurred_at),
      payload,
    });
    return ok(ev);
  },
};
