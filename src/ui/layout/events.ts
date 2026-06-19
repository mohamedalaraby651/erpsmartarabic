/**
 * Shell event bus — typed pub/sub used for analytics, telemetry, and
 * future plugin extensions. Pure JS, no React dependency.
 */
import type { ShellEventBus, ShellEventMap, ShellEventName } from "./types";

export function createShellEventBus(): ShellEventBus {
  const listeners = new Map<ShellEventName, Set<(payload: unknown) => void>>();

  return {
    emit(event, payload) {
      const set = listeners.get(event);
      if (!set) return;
      for (const l of set) {
        try {
          l(payload);
        } catch (err) {
          // Listener failures must never break the Shell.
          // eslint-disable-next-line no-console -- allow-console: sink/logger
          console.error(`[ui-shell] listener for "${event}" threw`, err);
        }
      }
    },
    on(event, listener) {
      let set = listeners.get(event);
      if (!set) {
        set = new Set();
        listeners.set(event, set);
      }
      const wrapped = listener as (payload: unknown) => void;
      set.add(wrapped);
      return () => {
        set?.delete(wrapped);
      };
    },
  };
}

export type { ShellEventBus, ShellEventMap, ShellEventName };
