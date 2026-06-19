/**
 * AppShell — root layout. Workspace-agnostic; renders Sidebar + Topbar +
 * children + StatusBar + CommandPalette. Token-only styling, RTL-aware.
 */
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { CommandPalette } from "./CommandPalette";
import { Sidebar } from "./Sidebar";
import { StatusBar } from "./StatusBar";
import { Topbar, type TopbarProps } from "./Topbar";

export interface AppShellProps {
  children: ReactNode;
  className?: string;
  topbarProps?: TopbarProps;
}

export function AppShell({ children, className, topbarProps }: AppShellProps) {
  return (
    <div
      className={cn(
        "flex min-h-screen bg-background text-foreground",
        className
      )}
    >
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar {...topbarProps} />
        <main className="flex-1" id="workspace-main">
          {children}
        </main>
        <StatusBar />
      </div>
      <CommandPalette />
    </div>
  );
}
