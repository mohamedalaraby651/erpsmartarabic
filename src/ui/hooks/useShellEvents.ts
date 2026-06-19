/**
 * useShellEvent — typed subscription to the Shell event bus.
 */
import { useEffect } from "react";
import { useShellEventBus } from "../providers/shell-services";
import type { ShellEventMap, ShellEventName } from "../layout/types";

export function useShellEvent<E extends ShellEventName>(
  event: E,
  listener: (payload: ShellEventMap[E]) => void
) {
  const bus = useShellEventBus();
  useEffect(() => bus.on(event, listener), [bus, event, listener]);
}
