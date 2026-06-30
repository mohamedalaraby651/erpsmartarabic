/**
 * EventCodecRegistry — routes events to their per-version codec
 * (UX-2B Wave 2A, R2).
 *
 * Two-key registry: `(type, schemaVersion) → codec`.
 *   - encode: looks up by event.type and the codec's own schemaVersion.
 *     If an event type has multiple registered versions, the HIGHEST
 *     schemaVersion is used for new writes (latest-write policy).
 *   - decode: looks up by the row's `(type, schema_version)`. Unknown
 *     pair → `CorruptedPersistenceData{cause:{reason:"UnknownEventType"}}`.
 *
 * Refinement R2: this is the ONLY module that handles `schemaVersion`
 * outside of individual codec files. The Repository is forbidden from
 * mentioning the literal (enforced by `SupabaseInvoiceRepository.purity.test.ts`).
 */
import { ok, err } from "@/shared-kernel";
import type { Result, RepositoryFailure } from "@/shared-kernel";
import type { AnyInvoiceEvent } from "@/domain/finance";
import type { EventCodec } from "./EventCodec";
import type { PersistedEventRow } from "./PersistedEventRow";

export class EventCodecRegistry {
  // type → (schemaVersion → codec)
  readonly #byType = new Map<string, Map<number, EventCodec>>();

  register<E extends AnyInvoiceEvent>(codec: EventCodec<E>): this {
    let versions = this.#byType.get(codec.type);
    if (!versions) {
      versions = new Map<number, EventCodec>();
      this.#byType.set(codec.type, versions);
    }
    if (versions.has(codec.schemaVersion)) {
      // Last-write-wins: re-registering a (type, version) replaces the
      // previous codec. We do NOT throw here — adapters must never throw
      // (enforced by `check-adapter-error-boundary`). Duplicate registration
      // is treated as an explicit override at composition time.
    }
    versions.set(codec.schemaVersion, codec as unknown as EventCodec);
    return this;
  }

  /** Encode a freshly-emitted domain event, using the LATEST registered version. */
  encode(event: AnyInvoiceEvent): Result<PersistedEventRow, RepositoryFailure> {
    const versions = this.#byType.get(event.type);
    if (!versions || versions.size === 0) {
      return err({
        kind: "CorruptedPersistenceData",
        message: `no codec registered for event type "${event.type}"`,
        cause: { reason: "UnknownEventType", type: event.type },
      });
    }
    const latest = Math.max(...versions.keys());
    const codec = versions.get(latest)!;
    return ok(codec.encode(event as never));
  }

  /** Decode a persisted row, dispatching by `(type, schema_version)`. */
  decode(row: PersistedEventRow): Result<AnyInvoiceEvent, RepositoryFailure> {
    const versions = this.#byType.get(row.type);
    if (!versions) {
      return err({
        kind: "CorruptedPersistenceData",
        message: `unknown event type "${row.type}"`,
        aggregateId: row.aggregate_id,
        sequence: row.sequence,
        cause: { reason: "UnknownEventType", type: row.type },
      });
    }
    const codec = versions.get(row.schema_version);
    if (!codec) {
      return err({
        kind: "CorruptedPersistenceData",
        message: `no codec for ${row.type}@v${row.schema_version}`,
        aggregateId: row.aggregate_id,
        sequence: row.sequence,
        cause: {
          reason: "UnknownEventType",
          type: row.type,
          schemaVersion: row.schema_version,
        },
      });
    }
    return codec.decode(row) as Result<AnyInvoiceEvent, RepositoryFailure>;
  }

  /** Diagnostic — enumerate registered (type, version) pairs. */
  list(): readonly { readonly type: string; readonly schemaVersion: number }[] {
    const out: { type: string; schemaVersion: number }[] = [];
    for (const [type, versions] of this.#byType) {
      for (const v of versions.keys()) out.push({ type, schemaVersion: v });
    }
    return out.sort(
      (a, b) =>
        a.type.localeCompare(b.type) || a.schemaVersion - b.schemaVersion,
    );
  }
}
