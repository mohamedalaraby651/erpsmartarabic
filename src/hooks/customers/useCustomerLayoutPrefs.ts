import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_KEY = "customers:layout-prefs:v1";

export type MobileSection = "stats" | "filters" | "summary" | "sort";
export type DesktopSection = "stats" | "alerts" | "filters";

export interface CustomerLayoutPrefs {
  mobile: Record<MobileSection, boolean>;
  desktop: Record<DesktopSection, boolean>;
  /** When true, every section above the list is hidden (search bar in the header stays). */
  compact: boolean;
  updatedAt: string;
}

const DEFAULTS: CustomerLayoutPrefs = {
  mobile: { stats: true, filters: true, summary: true, sort: true },
  desktop: { stats: true, alerts: true, filters: true },
  compact: false,
  updatedAt: new Date(0).toISOString(),
};

function read(): CustomerLayoutPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<CustomerLayoutPrefs>;
    return {
      mobile: { ...DEFAULTS.mobile, ...(parsed.mobile ?? {}) },
      desktop: { ...DEFAULTS.desktop, ...(parsed.desktop ?? {}) },
      compact: !!parsed.compact,
      updatedAt: parsed.updatedAt ?? DEFAULTS.updatedAt,
    };
  } catch {
    return DEFAULTS;
  }
}

export function useCustomerLayoutPrefs() {
  const [prefs, setPrefs] = useState<CustomerLayoutPrefs>(() => read());
  const writeTimerRef = useRef<number | null>(null);

  // Debounced persistence
  useEffect(() => {
    if (writeTimerRef.current != null) window.clearTimeout(writeTimerRef.current);
    writeTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ ...prefs, updatedAt: new Date().toISOString() }),
        );
      } catch {
        // ignore quota / privacy-mode errors — preference will revert to default next session
      }
    }, 150);
    return () => {
      if (writeTimerRef.current != null) window.clearTimeout(writeTimerRef.current);
    };
  }, [prefs]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(read());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setMobileSection = useCallback((key: MobileSection, value: boolean) => {
    setPrefs((p) => ({ ...p, mobile: { ...p.mobile, [key]: value } }));
  }, []);

  const setDesktopSection = useCallback((key: DesktopSection, value: boolean) => {
    setPrefs((p) => ({ ...p, desktop: { ...p.desktop, [key]: value } }));
  }, []);

  const toggleCompact = useCallback(() => {
    setPrefs((p) => ({ ...p, compact: !p.compact }));
  }, []);

  const setCompact = useCallback((value: boolean) => {
    setPrefs((p) => ({ ...p, compact: value }));
  }, []);

  const reset = useCallback(() => setPrefs({ ...DEFAULTS, updatedAt: new Date().toISOString() }), []);

  /** Helpers — return the *effective* visibility (compact mode wins). */
  const isMobileVisible = useCallback(
    (key: MobileSection) => !prefs.compact && prefs.mobile[key],
    [prefs.compact, prefs.mobile],
  );
  const isDesktopVisible = useCallback(
    (key: DesktopSection) => !prefs.compact && prefs.desktop[key],
    [prefs.compact, prefs.desktop],
  );

  return {
    prefs,
    setMobileSection,
    setDesktopSection,
    toggleCompact,
    setCompact,
    reset,
    isMobileVisible,
    isDesktopVisible,
  };
}

export type UseCustomerLayoutPrefs = ReturnType<typeof useCustomerLayoutPrefs>;
