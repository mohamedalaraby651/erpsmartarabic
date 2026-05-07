import { useState, useCallback, useEffect } from 'react';

type Storage = 'local' | 'session';

/**
 * Persists state in localStorage (default) or sessionStorage with versioning.
 * Survives full reloads and back navigation.
 */
export function usePersistentState<T>(
  key: string,
  defaultValue: T,
  options: { storage?: Storage; version?: number } = {},
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const { storage = 'local', version = 1 } = options;
  const storageKey = `lov_${key}_v${version}`;
  const store = typeof window === 'undefined'
    ? null
    : storage === 'local' ? window.localStorage : window.sessionStorage;

  const [value, setValue] = useState<T>(() => {
    if (!store) return defaultValue;
    try {
      const raw = store.getItem(storageKey);
      if (raw !== null) return JSON.parse(raw) as T;
    } catch { /* ignore */ }
    return defaultValue;
  });

  const setAndPersist = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
      try {
        store?.setItem(storageKey, JSON.stringify(resolved));
      } catch { /* quota */ }
      return resolved;
    });
  }, [storageKey, store]);

  const clear = useCallback(() => {
    try { store?.removeItem(storageKey); } catch { /* ignore */ }
    setValue(defaultValue);
  }, [storageKey, store, defaultValue]);

  // Cross-tab sync (localStorage only)
  useEffect(() => {
    if (storage !== 'local' || typeof window === 'undefined') return;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== storageKey || e.newValue === null) return;
      try { setValue(JSON.parse(e.newValue) as T); } catch { /* ignore */ }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [storageKey, storage]);

  return [value, setAndPersist, clear];
}
