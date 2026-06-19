/**
 * Topbar — composes navigation chrome above the workspace canvas.
 */
import { Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebar } from "../hooks/useSidebar";
import { useSlotRegistry } from "../providers/shell-services";
import { Breadcrumbs } from "./Breadcrumbs";
import { CommandPaletteTrigger } from "./CommandPalette";
import { NotificationCenter } from "./NotificationCenter";
import { UserMenu, type UserMenuProps } from "./UserMenu";
import { WorkspaceSwitcher } from "./WorkspaceSwitcher";

export interface TopbarProps extends UserMenuProps {
  className?: string;
}

export function Topbar({ className, ...userMenuProps }: TopbarProps) {
  const { openMobile, toggle } = useSidebar();
  const slots = useSlotRegistry();

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-background/60",
        className
      )}
    >
      {/* Mobile menu */}
      <button
        type="button"
        onClick={openMobile}
        className="lg:hidden inline-flex size-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open menu"
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>

      {/* Desktop sidebar toggle */}
      <button
        type="button"
        onClick={toggle}
        className="hidden lg:inline-flex size-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Toggle sidebar"
      >
        <Menu className="size-4" aria-hidden="true" />
      </button>

      <div className="flex items-center gap-2">
        <WorkspaceSwitcher />
        {slots.render("topbar.start")}
      </div>

      <div className="hidden md:flex flex-1 items-center justify-center gap-3">
        <Breadcrumbs />
        {slots.render("topbar.center")}
      </div>

      <div className="ms-auto flex items-center gap-1">
        {slots.render("topbar.end")}
        <CommandPaletteTrigger />
        <NotificationCenter />
        <UserMenu {...userMenuProps} />
      </div>
    </header>
  );
}
