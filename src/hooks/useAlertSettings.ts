import { useState, useCallback, useEffect } from 'react';

const STORAGE_KEY = 'customer-alert-settings';

export interface AlertSettings {
  // Toggle each alert type
  enableCreditExceeded: boolean;
  enableOverduePayment: boolean;
  enableCreditApproaching: boolean;
  enableUpcomingDue: boolean;
  enableVipNoContact: boolean;
  enableSalesDecline: boolean;
  enableInactive: boolean;
  enableNewCustomer: boolean;
  // Thresholds
  creditWarningPercent: number; // default 80
  inactiveDays: number; // default 90
  vipNoContactDays: number; // default 30
  overdueDaysThreshold: number; // default 60
  upcomingDueDays: number; // default 7
  salesDeclinePercent: number; // default 30
  // Filter
  minSeverity: 'all' | 'warning' | 'error';
  // Sound
  soundEnabled: boolean;
}

const DEFAULT_SETTINGS: AlertSettings = {
  enableCreditExceeded: true,
  enableOverduePayment: true,
  enableCreditApproaching: true,
  enableUpcomingDue: true,
  enableVipNoContact: true,
  enableSalesDecline: true,
  enableInactive: true,
  enableNewCustomer: true,
  creditWarningPercent: 80,
  inactiveDays: 90,
  vipNoContactDays: 30,
  overdueDaysThreshold: 60,
  upcomingDueDays: 7,
  salesDeclinePercent: 30,
  minSeverity: 'all',
  soundEnabled: true,
};

function loadSettings(): AlertSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS;
}

export function useAlertSettings() {
  const [settings, setSettingsState] = useState<AlertSettings>(loadSettings);

  const updateSettings = useCallback((patch: Partial<AlertSettings>) => {
    setSettingsState(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSettingsState(DEFAULT_SETTINGS);
  }, []);

  return { settings, updateSettings, resetSettings, DEFAULT_SETTINGS };
}

// Session-based dismissed alerts
const DISMISSED_KEY = 'customer-alerts-dismissed-session';

export function useDismissedAlerts() {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    try {
      const raw = sessionStorage.getItem(DISMISSED_KEY);
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });

  const dismiss = useCallback((alertKey: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(alertKey);
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify([...next]));
      return next;
    });
  }, []);

  const isDismissed = useCallback((alertKey: string) => dismissed.has(alertKey), [dismissed]);

  return { dismiss, isDismissed, dismissedCount: dismissed.size };
}
