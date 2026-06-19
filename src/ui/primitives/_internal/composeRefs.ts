/**
 * composeRefs — merge multiple React refs into one.
 * Internal utility; not exported from `@/ui`.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 */
import type { MutableRefObject, Ref } from "react";

type AnyRef<T> = Ref<T> | MutableRefObject<T | null> | undefined | null;

export function composeRefs<T>(...refs: AnyRef<T>[]) {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };
}
