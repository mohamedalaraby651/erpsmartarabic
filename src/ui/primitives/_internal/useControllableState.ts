/**
 * useControllableState — controlled/uncontrolled state helper.
 * Internal utility; not exported from `@/ui`.
 *
 * @canonicalState Canonical
 * @adr ADR-0003
 * @since UX-1C
 */
import { useCallback, useRef, useState } from "react";

export function useControllableState<T>(opts: {
  value?: T;
  defaultValue?: T;
  onChange?: (next: T) => void;
}): [T | undefined, (next: T) => void] {
  const { value, defaultValue, onChange } = opts;
  const [internal, setInternal] = useState<T | undefined>(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? value : internal;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const set = useCallback(
    (next: T) => {
      if (!isControlled) setInternal(next);
      onChangeRef.current?.(next);
    },
    [isControlled],
  );
  return [current, set];
}
