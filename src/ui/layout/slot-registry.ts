/**
 * Slot registry — allows workspaces / providers to contribute UI fragments
 * to predefined Shell regions (topbar.start, sidebar.footer, …) without
 * editing the Shell itself.
 */
import type { ReactNode } from "react";
import type { SlotEntry, SlotName } from "./types";

export interface SlotRegistry {
  register(slot: SlotName, entry: SlotEntry): () => void;
  render(slot: SlotName): ReactNode[];
  list(slot: SlotName): readonly SlotEntry[];
  subscribe(listener: () => void): () => void;
}

export function createSlotRegistry(): SlotRegistry {
  const slots = new Map<SlotName, Map<string, SlotEntry>>();
  const listeners = new Set<() => void>();

  function notify() {
    for (const l of listeners) l();
  }

  function getOrCreate(slot: SlotName) {
    let map = slots.get(slot);
    if (!map) {
      map = new Map();
      slots.set(slot, map);
    }
    return map;
  }

  return {
    register(slot, entry) {
      getOrCreate(slot).set(entry.id, entry);
      notify();
      return () => {
        slots.get(slot)?.delete(entry.id);
        notify();
      };
    },
    list(slot) {
      const map = slots.get(slot);
      if (!map) return [];
      return Array.from(map.values()).sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
    },
    render(slot) {
      const map = slots.get(slot);
      if (!map) return [];
      const entries = Array.from(map.values()).sort(
        (a, b) => (a.order ?? 0) - (b.order ?? 0)
      );
      return entries.map((e) => e.render());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
