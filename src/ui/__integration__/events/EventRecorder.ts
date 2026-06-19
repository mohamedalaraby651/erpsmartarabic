/**
 * Immutable EventRecorder — UX-1E.
 *
 * @canonicalState Spike
 * @adr ADR-0005
 * @since UX-1E
 *
 * Captures every CompositeEvent, deep-clones + freezes it (Invariant E7),
 * stamps a relative timestamp, and exposes flush/dump.
 */
import type { CompositeEvent, EventPayload } from "@/ui/contracts";

export interface RecordedEvent {
  readonly t: number;
  readonly event: CompositeEvent<string, EventPayload>;
}

export interface EventRecorder {
  record(event: CompositeEvent<string, EventPayload>): void;
  flush(): ReadonlyArray<RecordedEvent>;
  dump(): string;
  size(): number;
  clear(): void;
}

export function createRecorder(): EventRecorder {
  const buffer: RecordedEvent[] = [];
  const t0 =
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now()
      : 0;
  const now = () =>
    typeof performance !== "undefined" && typeof performance.now === "function"
      ? performance.now() - t0
      : 0;

  return {
    record(event) {
      // Deep clone then freeze so adapters cannot mutate after recording.
      const cloned =
        typeof structuredClone === "function"
          ? structuredClone(event)
          : JSON.parse(JSON.stringify(event));
      const frozen = Object.freeze({
        ...cloned,
        payload: Object.freeze({ ...cloned.payload }),
      }) as CompositeEvent<string, EventPayload>;
      buffer.push(Object.freeze({ t: now(), event: frozen }));
    },
    flush() {
      return buffer.slice();
    },
    dump() {
      return JSON.stringify(buffer, null, 2);
    },
    size() {
      return buffer.length;
    },
    clear() {
      buffer.length = 0;
    },
  };
}
