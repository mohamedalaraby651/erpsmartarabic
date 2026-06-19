/**
 * WorkspaceProvider — exposes the registry + active workspace.
 * Fires lifecycle hooks (`onActivate` / `onDeactivate`) and emits
 * `workspace:changed` on the event bus.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createWorkspaceRegistry } from "../layout/registry";
import type {
  WorkspaceDefinition,
  WorkspaceId,
  WorkspaceRegistry,
} from "../layout/types";
import { useShellEventBus } from "./shell-services";

interface WorkspaceContextValue {
  registry: WorkspaceRegistry;
  activeId: WorkspaceId | null;
  active: WorkspaceDefinition | null;
  workspaces: readonly WorkspaceDefinition[];
  setActiveWorkspace(id: WorkspaceId | null): void;
  permissions: ReadonlySet<string>;
  setPermissions(perms: Iterable<string>): void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export interface WorkspaceProviderProps {
  children: ReactNode;
  workspaces?: readonly WorkspaceDefinition[];
  registry?: WorkspaceRegistry;
  initialActiveId?: WorkspaceId | null;
  initialPermissions?: Iterable<string>;
}

export function WorkspaceProvider({
  children,
  workspaces,
  registry: externalRegistry,
  initialActiveId = null,
  initialPermissions,
}: WorkspaceProviderProps) {
  const events = useShellEventBus();

  const [registry] = useState<WorkspaceRegistry>(
    () => externalRegistry ?? createWorkspaceRegistry(workspaces ?? [])
  );

  // Re-render on registry mutations.
  const [, setTick] = useState(0);
  useEffect(() => registry.subscribe(() => setTick((t) => t + 1)), [registry]);

  const [activeId, setActiveId] = useState<WorkspaceId | null>(initialActiveId);
  const [permissions, setPermsState] = useState<Set<string>>(
    () => new Set(initialPermissions ?? [])
  );

  // Lifecycle.
  const previousRef = useRef<WorkspaceId | null>(null);
  useEffect(() => {
    const prev = previousRef.current;
    if (prev === activeId) return;

    const prevDef = prev ? registry.get(prev) : null;
    const nextDef = activeId ? registry.get(activeId) : null;

    void prevDef?.lifecycle?.onDeactivate?.({ workspaceId: prev!, events });
    void nextDef?.lifecycle?.onActivate?.({ workspaceId: activeId!, events });

    events.emit("workspace:changed", { workspaceId: activeId, previous: prev });
    previousRef.current = activeId;
  }, [activeId, registry, events]);

  const setActiveWorkspace = useCallback(
    (id: WorkspaceId | null) => {
      if (id !== null && !registry.has(id)) {
        // eslint-disable-next-line no-console -- allow-console: sink/logger
        console.warn(`[ui-shell] cannot activate unknown workspace "${id}"`);
        return;
      }
      setActiveId(id);
    },
    [registry]
  );

  const setPermissions = useCallback((perms: Iterable<string>) => {
    setPermsState(new Set(perms));
  }, []);

  const value = useMemo<WorkspaceContextValue>(() => {
    const workspaces = registry.list();
    const active = activeId ? registry.get(activeId) ?? null : null;
    return {
      registry,
      activeId,
      active,
      workspaces,
      setActiveWorkspace,
      permissions,
      setPermissions,
    };
  }, [registry, activeId, setActiveWorkspace, permissions, setPermissions]);

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspaceContext(): WorkspaceContextValue {
  const ctx = useContext(WorkspaceContext);
  if (!ctx)
    throw new Error("useWorkspaceContext must be used within <WorkspaceProvider>");
  return ctx;
}


