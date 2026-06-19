/**
 * useCommandPalette — open/close + filter the merged command stream.
 *
 * Commands originate from the active workspace + globally registered ones.
 * The Shell stays unopinionated about global registration in UX-1B; consumers
 * pass extra commands via the `extraCommands` arg.
 */
import { useCallback, useMemo, useState } from "react";
import { useWorkspaceContext } from "../providers/WorkspaceProvider";
import { useShellEventBus } from "../providers/shell-services";
import type { CommandContext, CommandDef } from "../layout/types";

function fuzzyScore(needle: string, hay: string): number {
  if (!needle) return 1;
  const n = needle.toLowerCase();
  const h = hay.toLowerCase();
  if (h === n) return 100;
  if (h.startsWith(n)) return 80;
  if (h.includes(n)) return 60;
  let i = 0;
  for (const c of h) if (c === n[i]) i++;
  return i === n.length ? 20 : 0;
}

export function useCommandPalette(extraCommands: readonly CommandDef[] = []) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const { active, activeId, permissions } = useWorkspaceContext();
  const events = useShellEventBus();

  const openPalette = useCallback(() => {
    setOpen(true);
    events.emit("palette:opened", {});
  }, [events]);

  const closePalette = useCallback(() => {
    setOpen(false);
    setQuery("");
    events.emit("palette:closed", {});
  }, [events]);

  const ctx = useMemo<CommandContext>(
    () => ({ workspaceId: activeId, permissions }),
    [activeId, permissions]
  );

  const allCommands = useMemo<readonly CommandDef[]>(() => {
    const wsCommands = active?.commands ?? [];
    return [...extraCommands, ...wsCommands];
  }, [active, extraCommands]);

  const visibleCommands = useMemo(() => {
    return allCommands
      .filter((c) => (c.visible ? c.visible(ctx) : true))
      .sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));
  }, [allCommands, ctx]);

  const filtered = useMemo(() => {
    if (!query) return visibleCommands;
    return visibleCommands
      .map((c) => {
        const haystacks = [c.label, c.group ?? "", ...(c.keywords ?? [])];
        const score = Math.max(...haystacks.map((h) => fuzzyScore(query, h)));
        return { command: c, score };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((r) => r.command);
  }, [visibleCommands, query]);

  const run = useCallback(
    async (command: CommandDef) => {
      const enabled = command.enabled ? command.enabled(ctx) : true;
      if (!enabled) return;
      await command.run(ctx);
      events.emit("command:executed", {
        commandId: command.id,
        workspaceId: activeId,
      });
      closePalette();
    },
    [ctx, events, activeId, closePalette]
  );

  return {
    open,
    setOpen,
    openPalette,
    closePalette,
    query,
    setQuery,
    commands: filtered,
    run,
  };
}
