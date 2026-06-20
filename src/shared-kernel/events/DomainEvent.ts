/**
 * DomainEvent — immutable record of something that happened in the domain.
 *
 * `metadata` is optional and reserved for future Saga / Outbox / Event Replay /
 * distributed-tracing concerns. Including it from day one keeps the interface
 * stable across UX-2 → UX-3 transitions.
 */
import type { Instant } from "../time/Instant";
import type { Id } from "../identity/Id";

export interface DomainEventMetadata {
  readonly correlationId?: string;
  readonly causationId?: string;
}

export interface DomainEvent<TPayload = unknown> {
  readonly id: Id<"DomainEvent">;
  readonly occurredAt: Instant;
  readonly type: string;
  readonly payload: Readonly<TPayload>;
  readonly metadata?: Readonly<DomainEventMetadata>;
}

export function freezeEvent<T>(e: DomainEvent<T>): DomainEvent<T> {
  Object.freeze(e);
  Object.freeze(e.payload);
  if (e.metadata) Object.freeze(e.metadata);
  return e;
}
