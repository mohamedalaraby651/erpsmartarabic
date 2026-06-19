/**
 * WorkspaceSwitcher — popover listing registered workspaces.
 */
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useWorkspace } from "../hooks/useWorkspace";
import { resolveIcon } from "./icon";

export function WorkspaceSwitcher() {
  const { workspace, workspaces, setActiveWorkspace } = useWorkspace();
  const [open, setOpen] = useState(false);
  const Icon = resolveIcon(workspace?.icon);

  if (workspaces.length === 0) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5",
          "text-sm font-medium hover:bg-accent hover:text-accent-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-label="Switch workspace"
      >
        <Icon className="size-4" aria-hidden="true" />
        <span className="max-w-[140px] truncate">{workspace?.name ?? "Select"}</span>
        <ChevronsUpDown className="size-3.5 text-muted-foreground" aria-hidden="true" />
      </PopoverTrigger>
      <PopoverContent className="w-64 p-1" align="start">
        <ul role="listbox">
          {workspaces.map((ws) => {
            const ItemIcon = resolveIcon(ws.icon);
            const active = ws.id === workspace?.id;
            return (
              <li key={ws.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setActiveWorkspace(ws.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-start",
                    "hover:bg-accent hover:text-accent-foreground",
                    active && "bg-accent text-accent-foreground"
                  )}
                >
                  <ItemIcon className="size-4" aria-hidden="true" />
                  <span className="flex-1 truncate">{ws.name}</span>
                  {active && <Check className="size-4" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
