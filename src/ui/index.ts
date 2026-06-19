/**
 * `src/ui` public surface — UX-1B.
 *
 * Only the design tokens, canonical primitives, and the UI Shell API are
 * exported here. Workspace, contract, and data-layer code arrive later.
 */

// Tokens (UX-1A)
export * from "./tokens";

// Primitives (UX-1A+ / UX-1C canonical set)
export { Button, buttonVariants, type ButtonProps } from "./primitives/Button";
export { IconButton, type IconButtonProps } from "./primitives/IconButton";
export { Input, type InputProps } from "./primitives/Input";
export { Textarea, type TextareaProps } from "./primitives/Textarea";
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "./primitives/Select";
export { Checkbox } from "./primitives/Checkbox";
export { RadioGroup, RadioGroupItem } from "./primitives/RadioGroup";
export { Switch } from "./primitives/Switch";
export { Label, type LabelProps } from "./primitives/Label";
export { FormField, type FormFieldProps } from "./primitives/FormField";
export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./primitives/Card";
export { Badge, type BadgeProps } from "./primitives/Badge";
export { Avatar, AvatarImage, AvatarFallback } from "./primitives/Avatar";
export { Separator } from "./primitives/Separator";
export { Skeleton } from "./primitives/Skeleton";
export { Spinner, type SpinnerProps } from "./primitives/Spinner";
export {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "./primitives/Tooltip";
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "./primitives/Dialog";
export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  type SheetContentProps,
  type SheetSide,
} from "./primitives/Sheet";
export { Toaster, toast, type ToasterProps } from "./primitives/Toast";
export {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "./primitives/Tabs";
export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "./primitives/Table";
export type { Size, Tone, Variant, Density, FieldAriaProps } from "./primitives/types";

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
