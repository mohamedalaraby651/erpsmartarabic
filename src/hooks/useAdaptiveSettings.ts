import { useEffect, useState, useCallback } from 'react';
import {
  loadSettings,
  saveSettings,
  applyPreset,
  type AdaptiveSettings,
  type SettingsMode,
} from '@/lib/adaptiveSettings';
import { onNetworkChange, getAdaptiveProfile, type AdaptiveProfile } from '@/lib/networkProfile';

export function useAdaptiveSettings() {
  const [settings, setSettings] = useState<AdaptiveSettings>(() => loadSettings());
  const [profile, setProfile] = useState<AdaptiveProfile>(() => getAdaptiveProfile());

  // الاستماع لتغييرات الإعدادات من تبويبات/مكونات أخرى
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<AdaptiveSettings>).detail;
      if (detail) setSettings(detail);
    };
    window.addEventListener('adaptive-settings:changed', handler);
    return () => window.removeEventListener('adaptive-settings:changed', handler);
  }, []);

  // الاستماع لتغييرات الشبكة وإعادة حساب التلقائي
  useEffect(() => {
    const unsub = onNetworkChange(() => {
      const next = getAdaptiveProfile();
      setProfile(next);
      // إذا كان الوضع تلقائي، حدّث الإعدادات
      const current = loadSettings();
      if (current.mode === 'auto') {
        const refreshed = applyPreset('auto');
        setSettings(refreshed);
      }
    });
    return unsub;
  }, []);

  const setMode = useCallback((mode: SettingsMode) => {
    const next = applyPreset(mode);
    setSettings(next);
  }, []);

  const updateField = useCallback(<K extends keyof AdaptiveSettings>(
    key: K,
    value: AdaptiveSettings[K],
  ) => {
    const next: AdaptiveSettings = { ...settings, [key]: value, mode: 'manual' };
    saveSettings(next);
    setSettings(next);
  }, [settings]);

  return { settings, profile, setMode, updateField };
}
