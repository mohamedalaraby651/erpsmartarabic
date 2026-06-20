/**
 * Id<TBrand> — opaque branded value object (ADR-0006, Rule R-0008).
 *
 * Identity Authority: IdPort is the sole source of new identifiers.
 * Consumers MUST NOT construct identifiers via type assertions (`as Id<T>`)
 * except inside IdPort implementations, allow-listed repository deserialization
 * boundaries, and test fixtures.
 *
 * Enforced by check-identity-authority.
 */

declare const __brand: unique symbol;

export type Id<TBrand extends string> = string & {
  readonly [__brand]: TBrand;
};

/**
 * Internal constructor — for IdPort implementations and deserialization only.
 * The fitness check allow-lists `shared-kernel/identity/**` for `as Id<...>`.
 */
export function unsafeId<TBrand extends string>(value: string): Id<TBrand> {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError("Id: value must be a non-empty string");
  }
  return value as Id<TBrand>;
}

export function idEquals<TBrand extends string>(
  a: Id<TBrand>,
  b: Id<TBrand>,
): boolean {
  return a === b;
}
