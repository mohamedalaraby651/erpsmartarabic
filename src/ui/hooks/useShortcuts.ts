/**
 * useShortcuts — register one or more keyboard bindings.
 * Returns nothing; cleanup is automatic on unmount.
 */
import { useEffect } from "react";
import {
  useShortcutRegistry,
  type ShortcutBinding,
} from "../providers/ShortcutProvider";

export function useShortcuts(bindings: readonly ShortcutBinding[]) {
  const registry = useShortcutRegistry();
  useEffect(() => {
    const cleanups = bindings.map((b) => registry.register(b));
    return () => cleanups.forEach((c) => c());
    // bindings identity is the caller's responsibility (memoize if dynamic).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registry, bindings]);
}
