/**
 * AggregateRoot — encapsulated event store.
 *
 * The aggregate is the SOLE owner of its uncommitted events.
 * - `protected record(event)` — append
 * - `public pullEvents()`     — return frozen snapshot AND clear internal buffer
 *
 * No public getter, no setter, no direct array access.
 */
import { Entity } from "./Entity";
import type { DomainEvent } from "../events/DomainEvent";

export abstract class AggregateRoot<TBrand extends string> extends Entity<TBrand> {
  #events: DomainEvent[] = [];

  protected record(event: DomainEvent): void {
    this.#events.push(event);
  }

  pullEvents(): readonly DomainEvent[] {
    const snapshot = Object.freeze(this.#events.slice());
    this.#events = [];
    return snapshot;
  }
}
