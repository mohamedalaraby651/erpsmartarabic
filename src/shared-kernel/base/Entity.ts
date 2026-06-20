/**
 * Entity — has identity and a version (placeholder for Optimistic Concurrency).
 *
 * `version` is reserved for UX-2B. No bump-logic in Step 1; the field exists
 * so future addition does not mutate every aggregate signature.
 */
import type { Id } from "../identity/Id";

export abstract class Entity<TBrand extends string> {
  protected constructor(
    public readonly id: Id<TBrand>,
    protected readonly version: number = 0,
  ) {}

  equals(other: unknown): boolean {
    if (other === this) return true;
    if (!(other instanceof Entity)) return false;
    if (Object.getPrototypeOf(other) !== Object.getPrototypeOf(this)) return false;
    return (other as Entity<TBrand>).id === this.id;
  }

  getVersion(): number {
    return this.version;
  }
}
