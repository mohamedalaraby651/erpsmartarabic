/**
 * Workspace registry — Map-based, with mutation events.
 *
 * Today consumers register workspaces statically at app boot. The same API
 * supports the UX-4 Plugin SDK without a breaking change.
 */
import type {
  WorkspaceDefinition,
  WorkspaceId,
  WorkspaceRegistry,
} from "./types";

export function createWorkspaceRegistry(
  initial: readonly WorkspaceDefinition[] = []
): WorkspaceRegistry {
  const map = new Map<WorkspaceId, WorkspaceDefinition>();
  const listeners = new Set<() => void>();

  function notify() {
    for (const l of listeners) l();
  }

  for (const def of initial) map.set(def.id, def);

  return {
    register(def) {
      if (map.has(def.id)) {
        throw new Error(
          `[ui-shell] workspace "${def.id}" is already registered. Use replace() to override.`
        );
      }
      map.set(def.id, def);
      notify();
    },
    unregister(id) {
      if (map.delete(id)) notify();
    },
    replace(def) {
      map.set(def.id, def);
      notify();
    },
    get(id) {
      return map.get(id);
    },
    has(id) {
      return map.has(id);
    },
    list() {
      return Array.from(map.values());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
