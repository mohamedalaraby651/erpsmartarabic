import { useCallback, useEffect, useState } from 'react';

/** Balance privacy "eye" toggle (PRB-NAZRA-002 decision 321). Persisted per device. */
const KEY = 'nazra:balances-hidden';
const CLASS = 'balances-hidden';
const EVT = 'nazra:balances-privacy';

export function applyBalancePrivacy(hidden: boolean) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle(CLASS, hidden);
}

export function useBalancePrivacy() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => {
    const read = () => {
      const v = localStorage.getItem(KEY) === '1';
      setHidden(v);
      applyBalancePrivacy(v);
    };
    read();
    window.addEventListener(EVT, read);
    return () => window.removeEventListener(EVT, read);
  }, []);
  const toggle = useCallback(() => {
    const next = localStorage.getItem(KEY) !== '1';
    localStorage.setItem(KEY, next ? '1' : '0');
    window.dispatchEvent(new Event(EVT));
  }, []);
  return { hidden, toggle };
}
