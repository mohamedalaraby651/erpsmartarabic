/**
 * Shared Kernel — sole public surface.
 *
 * All consumers (domain, application, infrastructure, ui, composition) MUST
 * import from "@/shared-kernel" only. Deep imports such as
 * "@/shared-kernel/time/Instant" are forbidden by check-no-deep-imports.
 */

// Result / Either
export {
  Result,
  ok,
  err,
  isOk,
  isErr,
  map,
  mapErr,
  flatMap,
} from "./result/Result";
export type { Ok, Err } from "./result/Result";

export { left, right, isLeft, isRight } from "./either/Either";
export type { Either, Left, Right } from "./either/Either";

// Errors
export {
  DomainError,
  ApplicationError,
  InfrastructureFailure,
  isRetryable,
} from "./errors";
export type {
  RepositoryFailure,
  InfrastructurePhase,
} from "./errors";

// Time
export { Instant } from "./time/Instant";
export type { ClockPort } from "./time/ClockPort";

// Identity
export { unsafeId, idEquals } from "./identity/Id";
export type { Id } from "./identity/Id";
export type { IdPort } from "./identity/IdPort";

// Events
export { freezeEvent } from "./events/DomainEvent";
export type { DomainEvent, DomainEventMetadata } from "./events/DomainEvent";

// Context
export { createRequestContext } from "./context/RequestContext";
export type { RequestContext } from "./context/RequestContext";

// Base
export { ValueObject } from "./base/ValueObject";
export { Entity } from "./base/Entity";
export { AggregateRoot } from "./base/AggregateRoot";

// Pagination
export type { Page, PageRequest } from "./pagination/Page";
