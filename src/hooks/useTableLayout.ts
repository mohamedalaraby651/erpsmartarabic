/**
 * useTableLayout (OPA-UI-003 / COL-001..COL-003).
 *
 * Per-user, per-screen table presentation state: column widths, row density,
 * visible columns, column order and the scrollable body height. Persisted in
 * localStorage so it survives navigation and reloads. Presentation only — it
 * never touches data, permissions or queries.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

export type TableDensity = 'comfortable' | 'medium' | 'compact';

export interface TableLayoutState {
  version: number;
  widths: Record<string, number>;
  hidden: string[];
  order: string[];
  density: TableDensity;
  /** Max height of the scrollable table body in px; 0 = no limit. */
  bodyHeight: number;
  /**
   * Presentation-only: whether the screen's summary strip is collapsed.
   * Business filters and query state are deliberately NOT stored here.
   */
  summaryCollapsed: boolean;
}

const DEFAULT_STATE: TableLayoutState = {
  version: 2,
  widths: {},
  hidden: [],
  order: [],
  density: 'medium',
  bodyHeight: 0,
  summaryCollapsed: false,
};

interface TableLayoutOptions {
  defaultVisibleKeys?: readonly string[];
  legacyVisibleStorageKey?: string;
}

export const DENSITY_CLASS: Record<TableDensity, string> = {
  comfortable: '[&_td]:py-4 [&_th]:h-12 text-sm',
  medium: '[&_td]:py-2.5 [&_th]:h-11 text-sm',
  compact: '[&_td]:py-1.5 [&_td]:px-2 [&_th]:h-9 [&_th]:px-2 text-[13px]',
};

export const DENSITY_LABEL: Record<TableDensity, string> = {
  comfortable: 'مريح',
  medium: 'متوسط',
  compact: 'مضغوط',
};

export const TABLE_LAYOUT_VERSION = 2;

/** Preferences are scoped per user, screen, and contract version. */
export const tableLayoutStorageKey = (section: string, userId: string) =>
  `table-layout:v${TABLE_LAYOUT_VERSION}:${userId}:${section}`;

const legacyStorageKey = (section: string, userId: string) =>
  `table-layout:${userId}:${section}`;

export function normalizeTableLayout(input: unknown, allColumnKeys: string[]): TableLayoutState {
  const value = input && typeof input === 'object' ? input as Partial<TableLayoutState> : {};
  const validKeys = new Set(allColumnKeys);
  const widths = Object.fromEntries(
    Object.entries(value.widths ?? {}).filter(([key, width]) => validKeys.has(key) && Number.isFinite(width)),
  );
  const hidden = (value.hidden ?? []).filter((key) => validKeys.has(key));
  const order = (value.order ?? []).filter((key) => validKeys.has(key));
  const density = value.density === 'comfortable' || value.density === 'compact' ? value.density : 'medium';
  return {
    version: TABLE_LAYOUT_VERSION,
    widths,
    hidden,
    order,
    density,
    bodyHeight: typeof value.bodyHeight === 'number' && value.bodyHeight >= 0 ? value.bodyHeight : 0,
    summaryCollapsed: value.summaryCollapsed === true,
  };
}

function defaultState(allColumnKeys: string[], defaultVisibleKeys?: readonly string[]): TableLayoutState {
  const visible = new Set(defaultVisibleKeys ?? allColumnKeys);
  return { ...DEFAULT_STATE, hidden: allColumnKeys.filter((key) => !visible.has(key)) };
}

function read(
  section: string,
  userId: string,
  allColumnKeys: string[],
  options: TableLayoutOptions,
): TableLayoutState {
  const fallback = defaultState(allColumnKeys, options.defaultVisibleKeys);
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(tableLayoutStorageKey(section, userId))
      ?? window.localStorage.getItem(legacyStorageKey(section, userId));
    if (!raw && options.legacyVisibleStorageKey) {
      const legacyVisible = JSON.parse(window.localStorage.getItem(options.legacyVisibleStorageKey) ?? 'null');
      if (Array.isArray(legacyVisible)) {
        const visible = new Set(legacyVisible.filter((key): key is string => typeof key === 'string'));
        return { ...fallback, hidden: allColumnKeys.filter((key) => !visible.has(key)) };
      }
    }
    if (!raw) return fallback;
    return normalizeTableLayout(JSON.parse(raw), allColumnKeys);
  } catch {
    return fallback;
  }
}

export function useTableLayout(section: string, allColumnKeys: string[], options: TableLayoutOptions = {}) {
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';
  const defaultVisibleKeys = options.defaultVisibleKeys;
  const legacyVisibleStorageKey = options.legacyVisibleStorageKey;
  const [state, setState] = useState<TableLayoutState>(() => read(section, userId, allColumnKeys, options));

  // Switching account must not inherit the previous user's layout.
  useEffect(() => {
    setState(read(section, userId, allColumnKeys, { defaultVisibleKeys, legacyVisibleStorageKey }));
  }, [section, userId, allColumnKeys, defaultVisibleKeys, legacyVisibleStorageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(tableLayoutStorageKey(section, userId), JSON.stringify(state));
    } catch {
      /* storage may be unavailable (private mode) — layout stays in memory */
    }
  }, [section, userId, state]);

  const setWidth = useCallback((key: string, width: number) => {
    setState((s) => ({ ...s, widths: { ...s.widths, [key]: Math.round(width) } }));
  }, []);

  const autoFitWidth = useCallback((key: string) => {
    setState((s) => {
      const widths = { ...s.widths };
      delete widths[key];
      return { ...s, widths };
    });
  }, []);

  const toggleColumn = useCallback((key: string) => {
    setState((s) => ({
      ...s,
      hidden: s.hidden.includes(key) ? s.hidden.filter((k) => k !== key) : [...s.hidden, key],
    }));
  }, []);

  const moveColumn = useCallback(
    (key: string, direction: -1 | 1) => {
      setState((s) => {
        const current = s.order.length ? [...s.order] : [...allColumnKeys];
        const i = current.indexOf(key);
        const j = i + direction;
        if (i < 0 || j < 0 || j >= current.length) return s;
        [current[i], current[j]] = [current[j], current[i]];
        return { ...s, order: current };
      });
    },
    [allColumnKeys],
  );

  const moveColumnTo = useCallback(
    (key: string, targetKey: string) => {
      setState((s) => {
        const current = s.order.length ? [...s.order] : [...allColumnKeys];
        const from = current.indexOf(key);
        const to = current.indexOf(targetKey);
        if (from < 0 || to < 0 || from === to) return s;
        current.splice(from, 1);
        current.splice(to, 0, key);
        return { ...s, order: current };
      });
    },
    [allColumnKeys],
  );

  const setDensity = useCallback((density: TableDensity) => {
    setState((s) => ({ ...s, density }));
  }, []);

  const setBodyHeight = useCallback((bodyHeight: number) => {
    setState((s) => ({ ...s, bodyHeight }));
  }, []);

  const setSummaryCollapsed = useCallback((summaryCollapsed: boolean) => {
    setState((s) => ({ ...s, summaryCollapsed }));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(legacyStorageKey(section, userId));
    } catch {
      /* storage may be unavailable */
    }
    setState(defaultState(allColumnKeys, defaultVisibleKeys));
  }, [allColumnKeys, defaultVisibleKeys, section, userId]);

  /** Column keys in the user's order, hidden ones removed. */
  const visibleKeys = useMemo(() => {
    const ordered = state.order.length
      ? [...state.order.filter((k) => allColumnKeys.includes(k)),
         ...allColumnKeys.filter((k) => !state.order.includes(k))]
      : allColumnKeys;
    return ordered.filter((k) => !state.hidden.includes(k));
  }, [state.order, state.hidden, allColumnKeys]);

  const orderedKeys = useMemo(() => {
    return state.order.length
      ? [...state.order.filter((k) => allColumnKeys.includes(k)),
         ...allColumnKeys.filter((k) => !state.order.includes(k))]
      : allColumnKeys;
  }, [state.order, allColumnKeys]);

  return {
    ...state,
    visibleKeys,
    orderedKeys,
    setWidth,
    autoFitWidth,
    toggleColumn,
    moveColumn,
    moveColumnTo,
    setDensity,
    setBodyHeight,
    setSummaryCollapsed,
    reset,
  };
}

export type TableLayout = ReturnType<typeof useTableLayout>;
