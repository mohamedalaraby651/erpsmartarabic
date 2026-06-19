/**
 * StatusBar — slot host + workspace-declared status items.
 */
import { cn } from "@/lib/utils";
import { useSlotRegistry } from "../providers/shell-services";
import { useWorkspace } from "../hooks/useWorkspace";
import { resolveIcon } from "./icon";
import type { StatusItem } from "./types";

const toneClass: Record<NonNullable<StatusItem["tone"]>, string> = {
  neutral: "text-muted-foreground",
  info: "text-primary",
  success: "text-success",
  warning: "text-warning",
  danger: "text-destructive",
};

export function StatusBar({ className }: { className?: string }) {
  const slots = useSlotRegistry();
  const { workspace } = useWorkspace();
  const items = workspace?.status ?? [];

  if (
    items.length === 0 &&
    slots.list("statusbar.start").length === 0 &&
    slots.list("statusbar.end").length === 0
  ) {
    return null;
  }

  return (
    <footer
      className={cn(
        "flex h-8 items-center gap-3 border-t border-border bg-muted/40 px-3 text-xs",
        className
      )}
      aria-label="Status"
    >
      <div className="flex items-center gap-3">
        {slots.render("statusbar.start")}
        {items.map((it) => {
          const Icon = resolveIcon(it.icon);
          return (
            <span
              key={it.id}
              className={cn(
                "inline-flex items-center gap-1",
                toneClass[it.tone ?? "neutral"]
              )}
            >
              <Icon className="size-3.5" aria-hidden="true" />
              <span>{it.label}</span>
            </span>
          );
        })}
      </div>
      <div className="ms-auto flex items-center gap-3">
        {slots.render("statusbar.end")}
      </div>
    </footer>
  );
}
