/**
 * Shell services context — separated to break the import cycle between
 * `ShellProvider` and `WorkspaceProvider`.
 */
import { createContext, useContext } from "react";
import type { SlotRegistry } from "../layout/slot-registry";
import type {
  LocationAdapter,
  NotificationProvider,
  ShellEventBus,
  ShellUser,
} from "../layout/types";

export interface ShellServices {
  events: ShellEventBus;
  slots: SlotRegistry;
  location: LocationAdapter;
  notifications: NotificationProvider | null;
  user: ShellUser | null;
}

export const ShellServicesContext = createContext<ShellServices | null>(null);

export function useShellServices(): ShellServices {
  const ctx = useContext(ShellServicesContext);
  if (!ctx) throw new Error("Shell hooks must be used within <ShellProvider>");
  return ctx;
}

export const useShellEventBus = (): ShellEventBus => useShellServices().events;
export const useSlotRegistry = (): SlotRegistry => useShellServices().slots;
export const useLocationAdapter = (): LocationAdapter => useShellServices().location;
export const useNotificationProvider = (): NotificationProvider | null =>
  useShellServices().notifications;
export const useShellUser = (): ShellUser | null => useShellServices().user;
