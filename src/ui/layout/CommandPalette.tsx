/**
 * CommandPalette — cmdk-backed search dialog, opens on mod+k.
 * Groups commands by `group`; respects scope, visibility, enabled.
 */
import { useEffect, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useCommandPalette } from "../hooks/useCommandPalette";
import { useShortcuts } from "../hooks/useShortcuts";
import { useShortcutRegistry } from "../providers/ShortcutProvider";
import { resolveIcon } from "./icon";
import type { CommandDef } from "./types";

export function CommandPalette() {
  const palette = useCommandPalette();
  const shortcutRegistry = useShortcutRegistry();

  useShortcuts(
    useMemo(
      () => [
        {
          id: "ui-shell.open-palette",
          keys: "mod+k",
          scope: "global",
          description: "Open command palette",
          handler: (e) => {
            e.preventDefault();
            palette.openPalette();
          },
        },
      ],
      [palette]
    )
  );

  // Push dialog scope while open so other shortcuts are suppressed.
  useEffect(() => {
    if (!palette.open) return;
    return shortcutRegistry.pushDialogScope();
  }, [palette.open, shortcutRegistry]);

  const grouped = useMemo(() => {
    const map = new Map<string, CommandDef[]>();
    for (const c of palette.commands) {
      const g = c.group ?? "Commands";
      const arr = map.get(g) ?? [];
      arr.push(c);
      map.set(g, arr);
    }
    return Array.from(map.entries());
  }, [palette.commands]);

  return (
    <CommandDialog open={palette.open} onOpenChange={palette.setOpen}>
      <CommandInput
        placeholder="Type a command…"
        value={palette.query}
        onValueChange={palette.setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {grouped.map(([group, items]) => (
          <CommandGroup key={group} heading={group}>
            {items.map((c) => {
              const Icon = resolveIcon(c.icon);
              return (
                <CommandItem
                  key={c.id}
                  value={`${c.label} ${(c.keywords ?? []).join(" ")}`}
                  onSelect={() => void palette.run(c)}
                >
                  <Icon className="me-2 size-4" aria-hidden="true" />
                  <span>{c.label}</span>
                  {c.shortcut && (
                    <span className="ms-auto text-xs text-muted-foreground">
                      {c.shortcut}
                    </span>
                  )}
                </CommandItem>
              );
            })}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

export function CommandPaletteTrigger() {
  const palette = useCommandPalette();
  return (
    <button
      type="button"
      onClick={palette.openPalette}
      className="hidden sm:inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      aria-label="Open command palette"
    >
      <span>Search…</span>
      <kbd className="ms-2 rounded bg-muted px-1.5 py-0.5 text-xs">⌘K</kbd>
    </button>
  );
}
