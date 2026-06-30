/**
 * EventStreamRehydrator — separates "decode the stream" from "reconstruct
 * the aggregate" (UX-2B Wave 2A refinement R5).
 *
 * Pipeline (each step short-circuits with a `Result.err`):
 *   1. Decode every row via the codec registry → `AnyInvoiceEvent[]`.
 *   2. Detect sequence gaps locally (defense-in-depth; the aggregate also
 *      checks this in `fromHistory`, but here we tag the row precisely).
 *   3. Call `Invoice.fromHistory(id, events)`. Any domain invariant
 *      violation is wrapped as `CorruptedPersistenceData` with
 *      `cause.reason = "InvariantViolation"` (refinement R1 — no new
 *      kernel variant; the kernel taxonomy is untouched in Wave 2).
 *
 * This module is the ONLY place the Repository touches the aggregate
 * during a `load()` — the Repository itself remains pure transport.
 */
import { ok, err, isErr } from "@/shared-kernel";
import type { Result, RepositoryFailure } from "@/shared-kernel";
import { Invoice } from "@/domain/finance";
import type { AnyInvoiceEvent, InvoiceId } from "@/domain/finance";
import type { EventCodecRegistry } from "../codec/EventCodecRegistry";
import type { PersistedEventRow } from "../codec/PersistedEventRow";

export class EventStreamRehydrator {
  readonly #codec: EventCodecRegistry;

  constructor(codec: EventCodecRegistry) {
    this.#codec = codec;
  }

  rehydrate(
    id: InvoiceId,
    rows: readonly PersistedEventRow[],
  ): Result<Invoice, RepositoryFailure> {
    const events: AnyInvoiceEvent[] = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const expectedSeq = i + 1;
      if (row.sequence !== expectedSeq) {
        return err({
          kind: "CorruptedPersistenceData",
          message: `sequence gap at row ${i}: expected ${expectedSeq}, got ${row.sequence}`,
          aggregateId: String(id),
          sequence: row.sequence,
          cause: {
            reason: "SequenceGap",
            expected: expectedSeq,
            actual: row.sequence,
          },
        });
      }
      const dec = this.#codec.decode(row);
      if (isErr(dec)) return err(dec.error);
      events.push(dec.value);
    }

    const reh = Invoice.fromHistory(id, events);
    if (isErr(reh)) {
      return err({
        kind: "CorruptedPersistenceData",
        message: `rehydration invariant violation: ${reh.error.kind}`,
        aggregateId: String(id),
        cause: {
          reason: "InvariantViolation",
          domainError: reh.error,
        },
      });
    }
    return ok(reh.value);
  }
}
