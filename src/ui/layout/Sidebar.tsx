/**
 * Sidebar — desktop collapsible navigation column. Mobile uses Sheet.
 */
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useSidebar } from "../hooks/useSidebar";
import { useWorkspace } from "../hooks/useWorkspace";
import { useSlotRegistry } from "../providers/shell-services";
import { NavigationTree } from "./NavigationTree";
import { resolveIcon } from "./icon";

export function Sidebar() {
  const { collapsed, mobileOpen, closeMobile } = useSidebar();
  const { workspace } = useWorkspace();
  const slots = useSlotRegistry();
  const Icon = resolveIcon(workspace?.icon);

  const content = (
    <div className="flex h-full flex-col gap-2 bg-sidebar text-sidebar-foreground">
      <div
        className={cn(
          "flex items-center gap-2 border-b border-sidebar-border px-3 py-3",
          collapsed && "justify-center px-2"
        )}
      >
        <Icon className="size-5 text-sidebar-primary" aria-hidden="true" />
        {!collapsed && (
          <span className="truncate text-sm font-semibold">
            {workspace?.name ?? "ERP"}
          </span>
        )}
      </div>

      {slots.list("sidebar.header").length > 0 && (
        <div className="border-b border-sidebar-border px-2 py-2">
          {slots.render("sidebar.header")}
        </div>
      )}

      <nav
        className="flex-1 overflow-y-auto px-2 py-2"
        aria-label={workspace?.name ?? "Navigation"}
      >
        {workspace ? (
          <NavigationTree
            nodes={workspace.navigation}
            collapsed={collapsed}
          />
        ) : (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No workspace selected.
          </p>
        )}
      </nav>

      {slots.list("sidebar.footer").length > 0 && (
        <div className="border-t border-sidebar-border px-2 py-2">
          {slots.render("sidebar.footer")}
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden lg:flex h-screen sticky top-0 border-e border-sidebar-border",
          "transition-[width] duration-200",
          collapsed ? "w-14" : "w-64"
        )}
        aria-label="Primary"
      >
        {content}
      </aside>

      {/* Mobile sheet */}
      <Sheet open={mobileOpen} onOpenChange={(o) => !o && closeMobile()}>
        <SheetContent side="right" className="w-72 p-0">
          <SheetHeader className="sr-only">
            <SheetTitle>Navigation</SheetTitle>
          </SheetHeader>
          {content}
        </SheetContent>
      </Sheet>
    </>
  );
}
