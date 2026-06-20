/**
 * IdPort — Single Identity Authority (ADR-0006).
 *
 * Sole source of new identifiers. Implementations live in
 * src/infrastructure/identity/** (UuidIdAdapter, FakeIdAdapter).
 */
import type { Id } from "./Id";

export interface IdPort {
  generate<TBrand extends string>(): Id<TBrand>;
}
