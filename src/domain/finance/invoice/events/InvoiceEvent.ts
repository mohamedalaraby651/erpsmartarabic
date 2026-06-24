/**
 * InvoiceEvent — base for every event emitted by the Invoice aggregate.
 *
 * Layer hierarchy (Wave 4 / ADR-0011 §5):
 *
 *   DomainEvent          ← shared-kernel (eventId, occurredAt, sequence, type, payload)
 *      ▲
 *   InvoiceEvent         ← adds invoiceId, marks `sequence` as required
 *      ▲
 *   InvoiceIssued | InvoicePaymentApplied | InvoiceVoided
 *
 * Sequence is REQUIRED at this layer: event-sourced aggregates enforce
 * gap-free 1..N ordering on rehydration. The aggregate root is the sole
 * author of `sequence`; callers never supply it.
 */
import type { DomainEvent, Id } from "@/shared-kernel";
import type { InvoiceId } from "../InvoiceId";

export interface InvoiceEvent<TType extends string, TPayload>
  extends DomainEvent<TPayload> {
  readonly type: TType;
  readonly invoiceId: InvoiceId;
  readonly sequence: number;
}

/** Canonical event-id brand for invoice events (alias of the kernel id). */
export type DomainEventId = Id<"DomainEvent">;
