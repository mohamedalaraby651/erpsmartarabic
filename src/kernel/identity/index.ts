/**
 * Kernel · identity — pure ID abstractions. No crypto/DOM.
 */
export interface IdPort {
  next(): string;
}

/** Deterministic counter-based Id source, safe for tests. */
export class CounterIdPort implements IdPort {
  private n = 0;
  constructor(private readonly prefix = "id") {}
  next(): string {
    this.n += 1;
    return `${this.prefix}_${this.n}`;
  }
}

/** Opaque tagged-string identity used by kernel consumers. */
export type Id<Brand extends string = "Id"> = string & { readonly __brand: Brand };
export const asId = <B extends string = "Id">(v: string): Id<B> => v as Id<B>;
