# Workspace API

**Status:** Frozen v1 (UX-1, Wave 0)

## Purpose

Every product surface (Suppliers, Finance, Inventory, HR, CRM, …) is mounted as a **Workspace**. The Workspace API is the single contract between a workspace and the ERP UI Operating System.

## WorkspaceDefinition (frozen)

```ts
export interface WorkspaceDefinition {
  /** Stable id, kebab-case, used in routes and feature flags. */
  id: string;

  /** Human-readable name (Arabic by default; i18n key allowed). */
  name: string;

  /** Lucide icon name. */
  icon: string;

  /** Permission keys required to mount this workspace. */
  permissions: readonly string[];

  /** Navigation entries shown inside NavigationRegion. */
  navigation: readonly WorkspaceNavItem[];

  /** Routes mounted under /<id>/*. */
  routes: readonly WorkspaceRoute[];

  /** Optional dashboard widgets exposed to the home shell. */
  widgets?: readonly WorkspaceWidget[];
}

export interface WorkspaceNavItem {
  id: string;
  label: string;
  icon?: string;
  to: string;
  permissions?: readonly string[];
}

export interface WorkspaceRoute {
  path: string;
  element: React.ComponentType;
  permissions?: readonly string[];
}

export interface WorkspaceWidget {
  id: string;
  title: string;
  element: React.ComponentType;
  size: "sm" | "md" | "lg";
  permissions?: readonly string[];
}
```

## Rules

1. A workspace MUST export a single `WorkspaceDefinition` from `src/workspaces/<id>/workspace.ts`.
2. Workspaces MUST mount inside `WorkspaceShell`; direct rendering at the route level is forbidden.
3. Workspaces MUST NOT import from `src/lib/repositories/**` or `@supabase/*` — only from `src/contracts/**`.
4. Permission checks: declarative via the `permissions` field. Imperative checks inside components are forbidden in canonical workspaces.
5. The `WorkspaceProvider` injects `{ workspaceId, permissions, breadcrumbs }`; nested code reads this via `useWorkspace()`.
6. Routes are owned by the workspace; the root router only mounts the workspace, never individual screens.

## Versioning

`WorkspaceDefinition` is treated as a contract (`@contractVersion v1`). Breaking changes follow `CONTRACT_VERSIONING.md`.

## Enforcement

- `scripts/fitness/check-workspace-api.mjs` validates every workspace exports a valid `WorkspaceDefinition`.
- `scripts/fitness/check-layering.mjs` enforces the import rules above.
