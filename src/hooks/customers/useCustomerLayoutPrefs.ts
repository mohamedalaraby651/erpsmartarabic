import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "customers:layout-prefs:v1";
/** Key inside `user_preferences.table_settings` jsonb. */
const DB_SETTINGS_KEY = "customers_layout";

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

function normalize(input: unknown): CustomerLayoutPrefs {
  const p = (input ?? {}) as Partial<CustomerLayoutPrefs>;
  return {
    mobile: { ...DEFAULTS.mobile, ...(p.mobile ?? {}) },
    desktop: { ...DEFAULTS.desktop, ...(p.desktop ?? {}) },
    compact: !!p.compact,
    updatedAt: typeof p.updatedAt === "string" ? p.updatedAt : DEFAULTS.updatedAt,
  };
}

function readLocal(): CustomerLayoutPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return normalize(JSON.parse(raw));
  } catch {
    return DEFAULTS;
  }
}

function writeLocal(prefs: CustomerLayoutPrefs) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // ignore quota / privacy-mode errors
  }
}

/**
 * Hook لتخزين تفضيلات إخفاء/إظهار أقسام صفحة العملاء.
 * - مزامنة بين الأجهزة عبر `user_preferences.table_settings.customers_layout`.
 * - localStorage يبقى كذاكرة فورية + fallback عند الـ offline.
 * - عند تعارض الإصدارات، الأحدث (`updatedAt`) يفوز.
 */
export function useCustomerLayoutPrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<CustomerLayoutPrefs>(() => readLocal());
  const writeTimerRef = useRef<number | null>(null);
  const remoteLoadedRef = useRef(false);
  const lastSyncedJsonRef = useRef<string>("");

  // 1) Hydrate from DB once user is known. Newer of (local, remote) wins.
  useEffect(() => {
    if (!user?.id || remoteLoadedRef.current) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("user_preferences")
        .select("table_settings")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      remoteLoadedRef.current = true;
      if (error || !data) return;
      const remoteRaw = (data.table_settings as Record<string, unknown> | null)?.[DB_SETTINGS_KEY];
      if (!remoteRaw) return;
      const remote = normalize(remoteRaw);
      const local = readLocal();
      const winner = Date.parse(remote.updatedAt) >= Date.parse(local.updatedAt) ? remote : local;
      lastSyncedJsonRef.current = JSON.stringify({ ...winner, updatedAt: undefined });
      setPrefs(winner);
      writeLocal(winner);
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // 2) Persist locally + push to DB on change (debounced 400ms; skip if no semantic delta).
  useEffect(() => {
    writeLocal(prefs);
    if (writeTimerRef.current != null) window.clearTimeout(writeTimerRef.current);
    if (!user?.id || !remoteLoadedRef.current) return;

    const semantic = JSON.stringify({ ...prefs, updatedAt: undefined });
    if (semantic === lastSyncedJsonRef.current) return;

    writeTimerRef.current = window.setTimeout(async () => {
      try {
        const { data: existing } = await supabase
          .from("user_preferences")
          .select("id, table_settings")
          .eq("user_id", user.id)
          .maybeSingle();

        const merged = {
          ...((existing?.table_settings as Record<string, unknown> | null) ?? {}),
          [DB_SETTINGS_KEY]: { ...prefs, updatedAt: new Date().toISOString() },
        };

        if (existing) {
          await supabase
            .from("user_preferences")
            .update({ table_settings: merged } as never)
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("user_preferences")
            .insert({ user_id: user.id, table_settings: merged } as never);
        }
        lastSyncedJsonRef.current = semantic;
      } catch (e) {
        // Network/RLS errors fall back to localStorage silently — offline-friendly.
        console.warn("[customer-layout] failed to sync prefs:", e);
      }
    }, 400);

    return () => {
      if (writeTimerRef.current != null) window.clearTimeout(writeTimerRef.current);
    };
  }, [prefs, user?.id]);

  // 3) Cross-tab sync via storage event (same-device, multi-tab).
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(readLocal());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // 4) Cross-device realtime sync (when same user changes prefs on another device).
  useEffect(() => {
    if (!user?.id) return;
    const channel = supabase
      .channel(`user_preferences:${user.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "user_preferences", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const remoteRaw = (payload.new as { table_settings?: Record<string, unknown> } | null)?.table_settings?.[DB_SETTINGS_KEY];
          if (!remoteRaw) return;
          const remote = normalize(remoteRaw);
          if (Date.parse(remote.updatedAt) > Date.parse(prefs.updatedAt)) {
            lastSyncedJsonRef.current = JSON.stringify({ ...remote, updatedAt: undefined });
            setPrefs(remote);
            writeLocal(remote);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id, prefs.updatedAt]);

  const stamp = (next: Omit<CustomerLayoutPrefs, "updatedAt">): CustomerLayoutPrefs => ({
    ...next,
    updatedAt: new Date().toISOString(),
  });

  const setMobileSection = useCallback((key: MobileSection, value: boolean) => {
    setPrefs((p) => stamp({ ...p, mobile: { ...p.mobile, [key]: value } }));
  }, []);

  const setDesktopSection = useCallback((key: DesktopSection, value: boolean) => {
    setPrefs((p) => stamp({ ...p, desktop: { ...p.desktop, [key]: value } }));
  }, []);

  const toggleCompact = useCallback(() => {
    setPrefs((p) => stamp({ ...p, compact: !p.compact }));
  }, []);

  const setCompact = useCallback((value: boolean) => {
    setPrefs((p) => stamp({ ...p, compact: value }));
  }, []);

  const reset = useCallback(() => setPrefs(stamp(DEFAULTS)), []);

  const isMobileVisible = useCallback(
    (key: MobileSection) => !prefs.compact && prefs.mobile[key],
    [prefs.compact, prefs.mobile],
  );
  const isDesktopVisible = useCallback(
    (key: DesktopSection) => !prefs.compact && prefs.desktop[key],
    [prefs.compact, prefs.desktop],
  );

  return useMemo(() => ({
    prefs,
    setMobileSection,
    setDesktopSection,
    toggleCompact,
    setCompact,
    reset,
    isMobileVisible,
    isDesktopVisible,
    isSyncing: !!user?.id && !remoteLoadedRef.current,
  }), [prefs, setMobileSection, setDesktopSection, toggleCompact, setCompact, reset, isMobileVisible, isDesktopVisible, user?.id]);
}

export type UseCustomerLayoutPrefs = ReturnType<typeof useCustomerLayoutPrefs>;
