/**
 * UI Shell type contracts — UX-1B.
 *
 * `@contractVersion v1.1` — additive over the v1 `WorkspaceDefinition`
 * frozen in `docs/architecture/WORKSPACE_API.md`. Per
 * `docs/contracts/CONTRACT_VERSIONING.md` minor-version bumps add optional
 * fields only. All new fields here are optional.
 */
import type { ComponentType, ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  Identity                                                                  */
/* -------------------------------------------------------------------------- */

export type WorkspaceId = string;

/* -------------------------------------------------------------------------- */
/*  Navigation                                                                */
/* -------------------------------------------------------------------------- */

export type NavNodeType = "group" | "link";

export interface NavNode {
  id: string;
  type: NavNodeType;
  title: string;
  /** Lucide icon name (string) — resolved by NavigationTree. */
  icon?: string;
  /** Present on `type: "link"`. Workspace-relative or absolute. */
  to?: string;
  /** Present on `type: "group"`. */
  children?: readonly NavNode[];
  /** Optional badge — string or numeric counter. */
  badge?: string | number;
  /** Permission key required to see this node. */
  permission?: string;
  /** Feature flag key; node hides when flag is off. */
  featureFlag?: string;
  /** Force-hide regardless of permissions / flags. */
  hidden?: boolean;
  /** Sort weight inside its parent. Lower first. Default = 0. */
  order?: number;
}

/* -------------------------------------------------------------------------- */
/*  Commands (Palette + keyboard)                                             */
/* -------------------------------------------------------------------------- */

export type CommandScope = "global" | "workspace" | "screen";

export interface CommandContext {
  workspaceId: WorkspaceId | null;
  permissions: ReadonlySet<string>;
}

export interface CommandDef {
  id: string;
  label: string;
  /** Optional Lucide icon name. */
  icon?: string;
  /** Visibility & matching scope. */
  scope: CommandScope;
  /** Display group (e.g. "Navigation", "Finance"). */
  group?: string;
  /** Synonyms used by the palette's fuzzy search. */
  keywords?: readonly string[];
  /** Sort priority within group. Lower first. */
  priority?: number;
  /** Keyboard shortcut, e.g. `mod+k` or `g i`. */
  shortcut?: string;
  /** Returns false to hide the command in the palette. */
  visible?: (ctx: CommandContext) => boolean;
  /** Returns false to render command disabled. */
  enabled?: (ctx: CommandContext) => boolean;
  /** Executed when the user activates the command. */
  run: (ctx: CommandContext) => void | Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*  Breadcrumbs                                                               */
/* -------------------------------------------------------------------------- */

export interface Breadcrumb {
  label: string;
  to?: string;
}

export type BreadcrumbResolver = (
  pathname: string,
  ctx: { workspaceId: WorkspaceId | null }
) => readonly Breadcrumb[];

/* -------------------------------------------------------------------------- */
/*  Status & notifications                                                    */
/* -------------------------------------------------------------------------- */

export interface StatusItem {
  id: string;
  label: string;
  tone?: "neutral" | "info" | "success" | "warning" | "danger";
  icon?: string;
}

export interface Notification {
  id: string;
  title: string;
  description?: string;
  createdAt: string; // ISO
  read?: boolean;
  tone?: "info" | "success" | "warning" | "danger";
}

/**
 * Notification source contract — UI Shell does not fetch.
 * Implementations may proxy to polling, websockets, server push, etc.
 */
export interface NotificationProvider {
  subscribe(listener: (items: readonly Notification[]) => void): () => void;
  markRead?(id: string): void | Promise<void>;
  clear?(): void | Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*  Theme                                                                     */
/* -------------------------------------------------------------------------- */

export type ThemeMode = "light" | "dark" | "system";
export type ThemeVariant = "default" | "corporate" | "highContrast";
export type Direction = "ltr" | "rtl";
export type Density = "comfortable" | "compact";

/* -------------------------------------------------------------------------- */
/*  Layout state (versioned)                                                  */
/* -------------------------------------------------------------------------- */

export interface ShellLayoutState {
  sidebarCollapsed: boolean;
  mobileSidebarOpen: boolean;
  density: Density;
  themeMode: ThemeMode;
  themeVariant: ThemeVariant;
  dir: Direction;
}

export interface VersionedShellLayoutState {
  version: 1;
  state: ShellLayoutState;
}

/* -------------------------------------------------------------------------- */
/*  Slot registry                                                             */
/* -------------------------------------------------------------------------- */

export type SlotName =
  | "topbar.start"
  | "topbar.center"
  | "topbar.end"
  | "sidebar.header"
  | "sidebar.footer"
  | "statusbar.start"
  | "statusbar.end"
  | "notifications.empty";

export interface SlotEntry {
  id: string;
  /** Lower first. */
  order?: number;
  render: () => ReactNode;
}

/* -------------------------------------------------------------------------- */
/*  Location adapter                                                          */
/* -------------------------------------------------------------------------- */

/**
 * Decouples the Shell from any specific router. Default implementation
 * reads `window.location`. A `ReactRouterAdapter` ships in UX-1C.
 */
export interface LocationAdapter {
  pathname(): string;
  params(): Readonly<Record<string, string>>;
  query(): Readonly<Record<string, string>>;
  /** Optional subscribe — enables breadcrumb re-render on route change. */
  subscribe?(listener: () => void): () => void;
  /** Optional imperative navigation. */
  navigate?(to: string): void;
}

/* -------------------------------------------------------------------------- */
/*  Shell events (SHELL_INVARIANTS I2 — UI-only bus)                          */
/* -------------------------------------------------------------------------- */

/**
 * `ShellEventBus` is a UI lifecycle bus. Payloads MUST be flat and contain
 * only primitives / identifiers — never entities, query results, React nodes,
 * or functions. See `docs/architecture/SHELL_INVARIANTS.md` §I2.
 *
 * `ShellEventMap` is a closed union; arbitrary `emit("…")` calls do not
 * type-check, which is the first line of defence against domain leakage.
 */
export type ShellEventMap = {
  "workspace:changed": { workspaceId: WorkspaceId | null; previous: WorkspaceId | null };
  "workspace:registered": { workspaceId: WorkspaceId };
  "workspace:unregistered": { workspaceId: WorkspaceId };
  "sidebar:collapsed": { collapsed: boolean };
  "theme:changed": { mode: ThemeMode; variant: ThemeVariant; dir: Direction };
  "command:executed": { commandId: string; workspaceId: WorkspaceId | null };
  "palette:opened": Record<string, never>;
  "palette:closed": Record<string, never>;
};

export type ShellEventName = keyof ShellEventMap;

export interface ShellEventBus {
  emit<E extends ShellEventName>(event: E, payload: ShellEventMap[E]): void;
  on<E extends ShellEventName>(
    event: E,
    listener: (payload: ShellEventMap[E]) => void
  ): () => void;
}

/* -------------------------------------------------------------------------- */
/*  Workspace lifecycle                                                       */
/* -------------------------------------------------------------------------- */

export interface WorkspaceLifecycleContext {
  workspaceId: WorkspaceId;
  events: ShellEventBus;
}

export interface WorkspaceLifecycle {
  onActivate?(ctx: WorkspaceLifecycleContext): void | Promise<void>;
  onDeactivate?(ctx: WorkspaceLifecycleContext): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

/* -------------------------------------------------------------------------- */
/*  WorkspaceDefinition (v1.1 — additive)                                     */
/* -------------------------------------------------------------------------- */

/**
 * Identity + Manifest fields are serializable (`JSON.stringify`-safe).
 * Behaviour fields (`commands`, `breadcrumbs`, `lifecycle`) are optional and
 * may be registered separately when loaded from a JSON manifest in UX-4.
 *
 * UX-1B exit gate: `WorkspaceDefinition.manifest` round-trips through
 * `JSON.stringify` without loss.
 */
export interface WorkspaceManifest {
  id: WorkspaceId;
  name: string;
  /** Lucide icon name. */
  icon: string;
  permissions: readonly string[];
  navigation: readonly NavNode[];
  /** Workspace base route, e.g. `/finance`. */
  basePath: string;
  /** Optional declarative status items. */
  status?: readonly StatusItem[];
  /** Optional declarative metadata for plugin discovery. */
  meta?: Readonly<Record<string, string | number | boolean>>;
}

export interface WorkspaceDefinition extends WorkspaceManifest {
  /** Imperative commands surfaced in the Command Palette. */
  commands?: readonly CommandDef[];
  /** Custom breadcrumb resolver; falls back to navigation walk. */
  breadcrumbs?: BreadcrumbResolver;
  /** Lifecycle hooks (Memory-leak prevention). */
  lifecycle?: WorkspaceLifecycle;
  /** Routes are mounted by the router adapter, not by the Shell. */
  routes?: readonly {
    path: string;
    element: ComponentType;
    permissions?: readonly string[];
  }[];
}

/* -------------------------------------------------------------------------- */
/*  Workspace registry                                                        */
/* -------------------------------------------------------------------------- */

export interface WorkspaceRegistry {
  register(def: WorkspaceDefinition): void;
  unregister(id: WorkspaceId): void;
  replace(def: WorkspaceDefinition): void;
  get(id: WorkspaceId): WorkspaceDefinition | undefined;
  has(id: WorkspaceId): boolean;
  list(): readonly WorkspaceDefinition[];
  /** Subscribe to registry mutations. */
  subscribe(listener: () => void): () => void;
}

/* -------------------------------------------------------------------------- */
/*  User identity (Shell-side view-model only)                                */
/* -------------------------------------------------------------------------- */

export interface ShellUser {
  id: string;
  name: string;
  email?: string;
  avatarUrl?: string;
  initials?: string;
}
