import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Persists tab + filter state per page in sessionStorage.
 * Usage: const [tab, setTab] = useNavigationState('tab', 'default-tab');
 */
export function useNavigationState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const location = useLocation();
  const storageKey = `nav_${location.pathname}_${key}`;

  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved !== null) {
        return JSON.parse(saved) as T;
      }
    } catch {
      // ignore
    }
    return defaultValue;
  });

  const setAndPersist = useCallback((newValue: T) => {
    setValue(newValue);
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(newValue));
    } catch {
      // ignore quota errors
    }
  }, [storageKey]);

  return [value, setAndPersist];
}
