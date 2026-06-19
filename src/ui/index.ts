/**
 * `src/ui` public surface — UX-1B.
 *
 * Only the design tokens, canonical primitives, and the UI Shell API are
 * exported here. Workspace, contract, and data-layer code arrive later.
 */

// Tokens (UX-1A)
export * from "./tokens";

// Primitives (UX-1A+)
export { Button, buttonVariants, type ButtonProps } from "./primitives/Button";

// Shell — providers
export {
  ShellProvider,
  useShellEventBus,
  useSlotRegistry,
  useLocationAdapter,
  useNotificationProvider,
  useShellUser,
  type ShellProviderProps,
} from "./providers/ShellProvider";
export { LayoutProvider, useLayout } from "./providers/LayoutProvider";
export { ThemeProvider } from "./providers/ThemeProvider";
export {
  ShortcutProvider,
  useShortcutRegistry,
  type ShortcutBinding,
  type ShortcutScope,
} from "./providers/ShortcutProvider";
export { WorkspaceProvider, useWorkspaceContext } from "./providers/WorkspaceProvider";

// Shell — hooks
export { useSidebar } from "./hooks/useSidebar";
export {
  useWorkspace,
  useWorkspaces,
  useWorkspaceRegistry,
} from "./hooks/useWorkspace";
export { useCommandPalette } from "./hooks/useCommandPalette";
export { useShortcuts } from "./hooks/useShortcuts";
export { useBreadcrumbs } from "./hooks/useBreadcrumbs";
export { useShellEvent } from "./hooks/useShellEvents";

// Shell — layout
export { AppShell, type AppShellProps } from "./layout/AppShell";
export { Sidebar } from "./layout/Sidebar";
export { Topbar, type TopbarProps } from "./layout/Topbar";
export { NavigationTree } from "./layout/NavigationTree";
export { Breadcrumbs } from "./layout/Breadcrumbs";
export { WorkspaceSwitcher } from "./layout/WorkspaceSwitcher";
export {
  CommandPalette,
  CommandPaletteTrigger,
} from "./layout/CommandPalette";
export { NotificationCenter } from "./layout/NotificationCenter";
export { StatusBar } from "./layout/StatusBar";
export { UserMenu, type UserMenuProps } from "./layout/UserMenu";

// Shell — infrastructure
export { createWorkspaceRegistry } from "./layout/registry";
export { createShellEventBus } from "./layout/events";
export { createSlotRegistry, type SlotRegistry } from "./layout/slot-registry";
export { createWindowLocationAdapter } from "./layout/location-adapter";

// Shell — types
export type {
  Breadcrumb,
  BreadcrumbResolver,
  CommandContext,
  CommandDef,
  CommandScope,
  Density,
  Direction,
  LocationAdapter,
  NavNode,
  NavNodeType,
  Notification,
  NotificationProvider,
  ShellEventBus,
  ShellEventMap,
  ShellEventName,
  ShellLayoutState,
  ShellUser,
  SlotEntry,
  SlotName,
  StatusItem,
  ThemeMode,
  ThemeVariant,
  VersionedShellLayoutState,
  WorkspaceDefinition,
  WorkspaceId,
  WorkspaceLifecycle,
  WorkspaceLifecycleContext,
  WorkspaceManifest,
  WorkspaceRegistry,
} from "./layout/types";
