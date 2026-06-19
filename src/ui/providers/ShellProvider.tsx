/**
 * ShellProvider — composes Shell infrastructure: event bus, slot registry,
 * location adapter, layout, theme, shortcuts, and workspaces.
 *
 * This is the ONLY provider an application needs to mount.
 */
import { useMemo, type ReactNode } from "react";
import { createShellEventBus } from "../layout/events";
import { createSlotRegistry } from "../layout/slot-registry";
import { createWindowLocationAdapter } from "../layout/location-adapter";
import type {
  LocationAdapter,
  NotificationProvider,
  ShellUser,
  WorkspaceDefinition,
  WorkspaceId,
} from "../layout/types";
import { LayoutProvider, type LayoutProviderProps } from "./LayoutProvider";
import { ShortcutProvider } from "./ShortcutProvider";
import { ThemeProvider } from "./ThemeProvider";
import { WorkspaceProvider } from "./WorkspaceProvider";
import { ShellServicesContext, type ShellServices } from "./shell-services";

export interface ShellProviderProps {
  children: ReactNode;
  workspaces?: readonly WorkspaceDefinition[];
  initialActiveWorkspaceId?: WorkspaceId | null;
  permissions?: Iterable<string>;
  location?: LocationAdapter;
  notifications?: NotificationProvider;
  user?: ShellUser;
  layoutDefaults?: LayoutProviderProps["initial"];
}

export function ShellProvider({
  children,
  workspaces,
  initialActiveWorkspaceId = null,
  permissions,
  location,
  notifications,
  user,
  layoutDefaults,
}: ShellProviderProps) {
  const services = useMemo<ShellServices>(
    () => ({
      events: createShellEventBus(),
      slots: createSlotRegistry(),
      location: location ?? createWindowLocationAdapter(),
      notifications: notifications ?? null,
      user: user ?? null,
    }),
    [location, notifications, user]
  );

  return (
    <ShellServicesContext.Provider value={services}>
      <LayoutProvider initial={layoutDefaults}>
        <ThemeProvider>
          <ShortcutProvider>
            <WorkspaceProvider
              workspaces={workspaces}
              initialActiveId={initialActiveWorkspaceId}
              initialPermissions={permissions}
            >
              {children}
            </WorkspaceProvider>
          </ShortcutProvider>
        </ThemeProvider>
      </LayoutProvider>
    </ShellServicesContext.Provider>
  );
}

export {
  useShellEventBus,
  useSlotRegistry,
  useLocationAdapter,
  useNotificationProvider,
  useShellUser,
} from "./shell-services";
