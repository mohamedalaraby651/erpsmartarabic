/**
 * ShortcutProvider — keyboard registry with scope.
 *
 * Scopes: "global" always active; "workspace" active when a workspace is
 * mounted; "dialog" suppresses lower scopes (used by Command Palette).
 *
 * `mod` resolves to ⌘ on macOS, Ctrl elsewhere.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

export type ShortcutScope = "global" | "workspace" | "dialog";

export interface ShortcutBinding {
  id: string;
  keys: string; // e.g. "mod+k", "g i"
  scope: ShortcutScope;
  description?: string;
  handler: (e: KeyboardEvent) => void;
}

interface ShortcutContextValue {
  register(binding: ShortcutBinding): () => void;
  list(): readonly ShortcutBinding[];
  pushDialogScope(): () => void;
}

const ShortcutContext = createContext<ShortcutContextValue | null>(null);

function isMac() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/.test(navigator.platform);
}

function normalize(keys: string) {
  return keys
    .toLowerCase()
    .split("+")
    .map((k) => k.trim())
    .sort()
    .join("+");
}

function eventKey(e: KeyboardEvent): string {
  const parts: string[] = [];
  if (e.ctrlKey || (isMac() && e.metaKey)) parts.push("mod");
  if (e.altKey) parts.push("alt");
  if (e.shiftKey) parts.push("shift");
  const k = e.key.toLowerCase();
  if (k !== "control" && k !== "meta" && k !== "alt" && k !== "shift") parts.push(k);
  return parts.sort().join("+");
}

export interface ShortcutProviderProps {
  children: ReactNode;
}

export function ShortcutProvider({ children }: ShortcutProviderProps) {
  const bindings = useRef(new Map<string, ShortcutBinding>());
  const dialogDepth = useRef(0);

  const register = useCallback((binding: ShortcutBinding) => {
    bindings.current.set(binding.id, binding);
    return () => {
      bindings.current.delete(binding.id);
    };
  }, []);

  const pushDialogScope = useCallback(() => {
    dialogDepth.current += 1;
    return () => {
      dialogDepth.current = Math.max(0, dialogDepth.current - 1);
    };
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      // Skip when typing in inputs (unless mod is held).
      if (
        target &&
        !e.metaKey &&
        !e.ctrlKey &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = eventKey(e);
      const inDialog = dialogDepth.current > 0;
      for (const b of bindings.current.values()) {
        if (inDialog && b.scope !== "dialog") continue;
        if (normalize(b.keys) === key) {
          b.handler(e);
          return;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const value = useMemo<ShortcutContextValue>(
    () => ({
      register,
      list: () => Array.from(bindings.current.values()),
      pushDialogScope,
    }),
    [register, pushDialogScope]
  );

  return <ShortcutContext.Provider value={value}>{children}</ShortcutContext.Provider>;
}

export function useShortcutRegistry(): ShortcutContextValue {
  const ctx = useContext(ShortcutContext);
  if (!ctx)
    throw new Error("useShortcutRegistry must be used within <ShortcutProvider>");
  return ctx;
}
