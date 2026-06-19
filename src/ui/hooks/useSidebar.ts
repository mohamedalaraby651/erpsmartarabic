/**
 * useSidebar — Shell-level sidebar state (desktop collapse + mobile sheet).
 */
import { useCallback } from "react";
import { useLayout } from "../providers/LayoutProvider";
import { useShellEventBus } from "../providers/shell-services";

export function useSidebar() {
  const { state, setSidebarCollapsed, setMobileSidebarOpen } = useLayout();
  const events = useShellEventBus();

  const toggle = useCallback(() => {
    const next = !state.sidebarCollapsed;
    setSidebarCollapsed(next);
    events.emit("sidebar:collapsed", { collapsed: next });
  }, [state.sidebarCollapsed, setSidebarCollapsed, events]);

  const collapse = useCallback(() => {
    setSidebarCollapsed(true);
    events.emit("sidebar:collapsed", { collapsed: true });
  }, [setSidebarCollapsed, events]);

  const expand = useCallback(() => {
    setSidebarCollapsed(false);
    events.emit("sidebar:collapsed", { collapsed: false });
  }, [setSidebarCollapsed, events]);

  return {
    collapsed: state.sidebarCollapsed,
    mobileOpen: state.mobileSidebarOpen,
    toggle,
    collapse,
    expand,
    openMobile: () => setMobileSidebarOpen(true),
    closeMobile: () => setMobileSidebarOpen(false),
  };
}
