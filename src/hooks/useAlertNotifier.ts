import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAlertSettings } from './useAlertSettings';
import type { CustomerAlert } from './useCustomerAlerts';

const SEEN_KEY = 'customer-alerts-seen-keys';

function getSeenKeys(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveSeenKeys(keys: Set<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...keys]));
}

/**
 * Watches for new alerts and:
 * 1. Inserts a notification row into the notifications table
 * 2. Plays a subtle sound if enabled
 */
export function useAlertNotifier(alerts: CustomerAlert[], userId?: string) {
  const { settings } = useAlertSettings();
  const prevKeysRef = useRef<Set<string>>(getSeenKeys());

  useEffect(() => {
    if (!alerts.length || !userId) return;

    const currentKeys = new Set(alerts.map(a => `${a.type}-${a.customerId}`));
    const seenKeys = prevKeysRef.current;
    const newKeys: string[] = [];

    currentKeys.forEach(key => {
      if (!seenKeys.has(key)) newKeys.push(key);
    });

    if (newKeys.length === 0) {
      // Update seen keys (remove alerts that no longer exist)
      prevKeysRef.current = currentKeys;
      saveSeenKeys(currentKeys);
      return;
    }

    // Find new alert objects
    const newAlerts = alerts.filter(a => newKeys.includes(`${a.type}-${a.customerId}`));

    // Play sound
    if (settings.soundEnabled && newAlerts.length > 0) {
      try {
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 800;
        gain.gain.value = 0.04;
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        setTimeout(() => ctx.close(), 200);
      } catch { /* ignore */ }
    }

    // Insert notifications (batch, max 10 at a time to avoid spam)
    const toInsert = newAlerts.slice(0, 10).map(a => ({
      user_id: userId,
      title: getNotificationTitle(a.type),
      message: a.message,
      type: a.severity === 'error' ? 'alert' : a.severity === 'warning' ? 'warning' : 'info',
      link: `/customers/${a.customerId}`,
      is_read: false,
    }));

    if (toInsert.length > 0) {
      supabase.from('notifications').insert(toInsert).then(() => {});
    }

    // Update seen keys
    prevKeysRef.current = currentKeys;
    saveSeenKeys(currentKeys);
  }, [alerts, userId, settings.soundEnabled]);
}

function getNotificationTitle(type: string): string {
  const titles: Record<string, string> = {
    credit_exceeded: 'تنبيه: تجاوز حد ائتمان',
    overdue_payment: 'تنبيه: فاتورة متأخرة',
    credit_approaching: 'تنبيه: اقتراب من حد الائتمان',
    upcoming_due: 'تنبيه: دفعة مستحقة قريباً',
    vip_no_contact: 'تنبيه: عميل VIP بدون تواصل',
    sales_decline: 'تنبيه: انخفاض مبيعات',
    inactive: 'تنبيه: عميل خامل',
    new_customer: 'تنبيه: عميل جديد',
  };
  return titles[type] || 'تنبيه عملاء';
}
