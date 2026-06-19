/**
 * LayoutProvider — owns ShellLayoutState with versioned localStorage
 * persistence. Schema changes go through a migration step, not a cache wipe.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  Density,
  Direction,
  ShellLayoutState,
  ThemeMode,
  ThemeVariant,
  VersionedShellLayoutState,
} from "../layout/types";

const STORAGE_KEY = "ui.shell.layout";
const CURRENT_VERSION = 1 as const;

const DEFAULT_STATE: ShellLayoutState = {
  sidebarCollapsed: false,
  mobileSidebarOpen: false,
  density: "comfortable",
  themeMode: "system",
  themeVariant: "default",
  dir: "rtl",
};

type Migrator = (raw: unknown) => ShellLayoutState | null;

/** Future versions append handlers; v1 is identity. */
const MIGRATIONS: Record<number, Migrator> = {
  1: (raw) => {
    if (!raw || typeof raw !== "object") return null;
    const s = raw as Partial<ShellLayoutState>;
    return {
      sidebarCollapsed: Boolean(s.sidebarCollapsed),
      mobileSidebarOpen: false, // never persist transient sheet state
      density: s.density === "compact" ? "compact" : "comfortable",
      themeMode:
        s.themeMode === "light" || s.themeMode === "dark" ? s.themeMode : "system",
      themeVariant:
        s.themeVariant === "corporate" || s.themeVariant === "highContrast"
          ? s.themeVariant
          : "default",
      dir: s.dir === "ltr" ? "ltr" : "rtl",
    };
  },
};

function loadState(): ShellLayoutState {
  if (typeof window === "undefined") return DEFAULT_STATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATE;
    const parsed = JSON.parse(raw) as Partial<VersionedShellLayoutState>;
    const version =
      typeof parsed.version === "number" ? parsed.version : CURRENT_VERSION;
    const migrator = MIGRATIONS[version];
    if (!migrator) return DEFAULT_STATE;
    return migrator(parsed.state) ?? DEFAULT_STATE;
  } catch {
    return DEFAULT_STATE;
  }
}

function saveState(state: ShellLayoutState) {
  if (typeof window === "undefined") return;
  try {
    const payload: VersionedShellLayoutState = {
      version: CURRENT_VERSION,
      state: { ...state, mobileSidebarOpen: false },
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* quota / privacy mode — ignore */
  }
}

interface LayoutContextValue {
  state: ShellLayoutState;
  setSidebarCollapsed: (v: boolean) => void;
  setMobileSidebarOpen: (v: boolean) => void;
  setDensity: (d: Density) => void;
  setThemeMode: (m: ThemeMode) => void;
  setThemeVariant: (v: ThemeVariant) => void;
  setDirection: (d: Direction) => void;
  reset: () => void;
}

const LayoutContext = createContext<LayoutContextValue | null>(null);

export interface LayoutProviderProps {
  children: ReactNode;
  /** Override initial state — primarily for tests. */
  initial?: Partial<ShellLayoutState>;
}

export function LayoutProvider({ children, initial }: LayoutProviderProps) {
  const [state, setState] = useState<ShellLayoutState>(() => ({
    ...loadState(),
    ...initial,
  }));
  const ref = useRef(state);
  ref.current = state;

  useEffect(() => {
    saveState(state);
  }, [state]);

  const update = useCallback(
    <K extends keyof ShellLayoutState>(key: K, value: ShellLayoutState[K]) => {
      setState((prev) => (prev[key] === value ? prev : { ...prev, [key]: value }));
    },
    []
  );

  const value = useMemo<LayoutContextValue>(
    () => ({
      state,
      setSidebarCollapsed: (v) => update("sidebarCollapsed", v),
      setMobileSidebarOpen: (v) => update("mobileSidebarOpen", v),
      setDensity: (d) => update("density", d),
      setThemeMode: (m) => update("themeMode", m),
      setThemeVariant: (v) => update("themeVariant", v),
      setDirection: (d) => update("dir", d),
      reset: () => setState(DEFAULT_STATE),
    }),
    [state, update]
  );

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>;
}

export function useLayout(): LayoutContextValue {
  const ctx = useContext(LayoutContext);
  if (!ctx) throw new Error("useLayout must be used within <LayoutProvider>");
  return ctx;
}
