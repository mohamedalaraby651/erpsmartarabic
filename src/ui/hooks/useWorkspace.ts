/**
 * useWorkspace — read & switch the active workspace.
 */
import { useWorkspaceContext } from "../providers/WorkspaceProvider";

export function useWorkspace() {
  const { active, activeId, workspaces, setActiveWorkspace, permissions } =
    useWorkspaceContext();
  return {
    workspace: active,
    workspaceId: activeId,
    workspaces,
    setActiveWorkspace,
    permissions,
  };
}

export function useWorkspaces() {
  return useWorkspaceContext().workspaces;
}

export function useWorkspaceRegistry() {
  return useWorkspaceContext().registry;
}
