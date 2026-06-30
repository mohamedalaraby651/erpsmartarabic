/**
 * EventCodec — per-(type, schemaVersion) bidirectional translator
 * between domain events and `PersistedEventRow`s (UX-2B Wave 2A, R2).
 *
 * Hard contracts:
 *   - The Codec is the SOLE owner of `schemaVersion`. The Repository
 *     never reads, writes, or branches on it.
 *   - `encode` is total: it returns a row ready for `insert()`. Failure
 *     to encode a well-typed domain event is a programmer error and
 *     stays as a thrown defect — domain events are pre-validated by the
 *     aggregate, so encode cannot legitimately fail at runtime.
 *   - `decode` is partial and returns `Result<E, RepositoryFailure>`.
 *     Any malformed/missing field surfaces as
 *     `CorruptedPersistenceData` with `cause.reason = "DecodeFailure"`
 *     (Wave 2A refinement R1 — no new kernel variant).
 */
import type { Result, RepositoryFailure } from "@/shared-kernel";
import type { AnyInvoiceEvent } from "@/domain/finance";
import type { PersistedEventRow } from "./PersistedEventRow";

export interface EventCodec<E extends AnyInvoiceEvent = AnyInvoiceEvent> {
  readonly type: E["type"];
  readonly schemaVersion: number;
  encode(event: E): PersistedEventRow;
  decode(row: PersistedEventRow): Result<E, RepositoryFailure>;
}
