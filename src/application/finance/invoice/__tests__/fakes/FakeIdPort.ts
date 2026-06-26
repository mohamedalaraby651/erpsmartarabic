/**
 * FakeIdPort — deterministic IdPort for tests.
 * Emits sequential branded ids of the form `"fake-id-1"`, `"fake-id-2"`…
 */
import { unsafeId } from "@/shared-kernel";
import type { Id, IdPort } from "@/shared-kernel";

export class FakeIdPort implements IdPort {
  #counter = 0;
  readonly #prefix: string;

  constructor(prefix = "fake-id") {
    this.#prefix = prefix;
  }

  generate<TBrand extends string>(): Id<TBrand> {
    this.#counter += 1;
    return unsafeId<TBrand>(`${this.#prefix}-${this.#counter}`);
  }
}
