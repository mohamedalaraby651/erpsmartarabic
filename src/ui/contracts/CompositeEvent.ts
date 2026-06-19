/**
 * CompositeEvent envelope — UX-1D.
 *
 * @canonicalState Canonical
 * @adr ADR-0004
 * @since UX-1D
 *
 * Invariant C10: every event emitted by a composite MUST use this envelope
 * with a shallow primitive payload. No nested objects beyond one level,
 * no class instances, no DOM nodes, no Promises.
 *
 * Compile-time only — pure TypeScript (Invariant C8). Do not import React
 * or any runtime module from this file.
 */

/** Primitive scalar value permitted in event payloads. */
export type EventScalar = string | number | boolean | null | undefined;

/**
 * Shallow event payload — a record whose values are scalars, scalar arrays,
 * or a single-level nested record of scalars. This bound prevents leaking
 * domain objects or DOM nodes through the event bus.
 */
export type EventPayload = Readonly<
  Record<
    string,
    | EventScalar
    | ReadonlyArray<EventScalar>
    | Readonly<Record<string, EventScalar | ReadonlyArray<EventScalar>>>
  >
>;

/** Standard composite event envelope. */
export interface CompositeEvent<
  TType extends string = string,
  TPayload extends EventPayload = EventPayload,
> {
  readonly type: TType;
  readonly payload: TPayload;
}

/** Helper: a typed emitter signature for a composite event union. */
export type CompositeEventHandler<E extends CompositeEvent> = (event: E) => void;
