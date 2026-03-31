import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAlertSettings } from './useAlertSettings';
import { logErrorSafely } from '@/lib/errorHandler';
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
 * Play a subtle notification beep using HTML5 Audio fallback.
 * Uses AudioContext with resume() to handle browser autoplay policy.
 */
function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    // Resume in case suspended (autoplay policy)
    const play = () => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 800;
      gain.gain.value = 0.04;
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
      setTimeout(() => ctx.close(), 300);
    };
    if (ctx.state === 'suspended') {
      ctx.resume().then(play).catch(() => ctx.close());
    } else {
      play();
    }
  } catch { /* ignore unsupported browsers */ }
}

/**
 * Watches for new alerts and:
 * 1. Inserts a notification row into the notifications table (with dedup)
 * 2. Plays a subtle sound if enabled
 */
export function useAlertNotifier(alerts: CustomerAlert[], userId?: string) {
  const { settings } = useAlertSettings();
  const prevKeysRef = useRef<Set<string>>(getSeenKeys());

  // Stable reference for sound setting
  const soundEnabledRef = useRef(settings.soundEnabled);
  soundEnabledRef.current = settings.soundEnabled;

  const processAlerts = useCallback(async (newAlerts: CustomerAlert[], uid: string) => {
    // Play sound once
    if (soundEnabledRef.current && newAlerts.length > 0) {
      playNotificationSound();
    }

    // Insert notifications with dedup (max 10 per batch)
    const today = new Date().toISOString().slice(0, 10);
    const toInsert = newAlerts.slice(0, 10).map(a => ({
      user_id: uid,
      title: getNotificationTitle(a.type),
      message: a.message,
      type: a.severity === 'error' ? 'alert' : a.severity === 'warning' ? 'warning' : 'info',
      link: `/customers/${a.customerId}`,
      is_read: false,
    }));

    if (toInsert.length > 0) {
      try {
        // Check for existing notifications created today with same title+link to avoid duplicates
        const links = toInsert.map(n => n.link);
        const { data: existing } = await supabase
          .from('notifications')
          .select('link, title')
          .eq('user_id', uid)
          .gte('created_at', `${today}T00:00:00`)
          .in('link', links);

        const existingSet = new Set((existing || []).map(e => `${e.title}|${e.link}`));
        const filtered = toInsert.filter(n => !existingSet.has(`${n.title}|${n.link}`));

        if (filtered.length > 0) {
          const { error } = await supabase.from('notifications').insert(filtered);
          if (error) logErrorSafely(error, 'useAlertNotifier:insert');
        }
      } catch (err) {
        logErrorSafely(err, 'useAlertNotifier:process');
      }
    }
  }, []);

  useEffect(() => {
    if (!alerts.length || !userId) return;

    const currentKeys = new Set(alerts.map(a => `${a.type}-${a.customerId}`));
    const seenKeys = prevKeysRef.current;
    const newKeys: string[] = [];

    currentKeys.forEach(key => {
      if (!seenKeys.has(key)) newKeys.push(key);
    });

    if (newKeys.length === 0) {
      prevKeysRef.current = currentKeys;
      saveSeenKeys(currentKeys);
      return;
    }

    const newAlerts = alerts.filter(a => newKeys.includes(`${a.type}-${a.customerId}`));
    processAlerts(newAlerts, userId);

    prevKeysRef.current = currentKeys;
    saveSeenKeys(currentKeys);
  }, [alerts, userId, processAlerts]);
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
