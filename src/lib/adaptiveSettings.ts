/**
 * adaptiveSettings — إدارة إعدادات الأداء التكيفية القابلة للتعديل
 *
 * تخزن الإعدادات في localStorage مع 3 أوضاع:
 *  - 'auto'   : يستخدم القيم الموصى بها من networkProfile (الافتراضي)
 *  - 'manual' : يستخدم القيم التي حددها المستخدم
 *  - preset   : 'data-saver' | 'balanced' | 'performance'
 */

import {
  getAdaptiveProfile,
  type AdaptiveProfile,
} from './networkProfile';

export type SettingsMode = 'auto' | 'manual' | 'data-saver' | 'balanced' | 'performance';

export interface AdaptiveSettings {
  mode: SettingsMode;
  queryTimeoutMs: number;
  syncTimeoutMs: number;
  prefetchEnabled: boolean;
  prefetchOnHover: boolean;
  prefetchOnIdle: boolean;
  backgroundSyncIntervalMs: number;
  imageQuality: 'low' | 'medium' | 'high';
  enableAnimations: boolean;
  // إذا كانت الشبكة بطيئة، أوقف المزامنة في الخلفية تماماً
  pauseBackgroundOnSlowNetwork: boolean;
}

const STORAGE_KEY = 'adaptive-settings:v1';

export const PRESETS: Record<Exclude<SettingsMode, 'auto' | 'manual'>, Omit<AdaptiveSettings, 'mode'>> = {
  'data-saver': {
    queryTimeoutMs: 30000,
    syncTimeoutMs: 60000,
    prefetchEnabled: false,
    prefetchOnHover: false,
    prefetchOnIdle: false,
    backgroundSyncIntervalMs: 30 * 60 * 1000,
    imageQuality: 'low',
    enableAnimations: false,
    pauseBackgroundOnSlowNetwork: true,
  },
  balanced: {
    queryTimeoutMs: 15000,
    syncTimeoutMs: 30000,
    prefetchEnabled: true,
    prefetchOnHover: true,
    prefetchOnIdle: false,
    backgroundSyncIntervalMs: 5 * 60 * 1000,
    imageQuality: 'medium',
    enableAnimations: true,
    pauseBackgroundOnSlowNetwork: true,
  },
  performance: {
    queryTimeoutMs: 8000,
    syncTimeoutMs: 15000,
    prefetchEnabled: true,
    prefetchOnHover: true,
    prefetchOnIdle: true,
    backgroundSyncIntervalMs: 2 * 60 * 1000,
    imageQuality: 'high',
    enableAnimations: true,
    pauseBackgroundOnSlowNetwork: false,
  },
};

function buildAuto(profile: AdaptiveProfile): AdaptiveSettings {
  return {
    mode: 'auto',
    ...profile.recommended,
    pauseBackgroundOnSlowNetwork: true,
  };
}

export function loadSettings(): AdaptiveSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return buildAuto(getAdaptiveProfile());
    const parsed = JSON.parse(raw) as AdaptiveSettings;
    // إذا كان الوضع تلقائي، أعد الحساب من الشبكة الحالية
    if (parsed.mode === 'auto') return buildAuto(getAdaptiveProfile());
    return parsed;
  } catch {
    return buildAuto(getAdaptiveProfile());
  }
}

export function saveSettings(settings: AdaptiveSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent('adaptive-settings:changed', { detail: settings }));
  } catch (err) {
    console.warn('Failed to save adaptive settings:', err);
  }
}

export function applyPreset(mode: SettingsMode): AdaptiveSettings {
  let next: AdaptiveSettings;
  if (mode === 'auto') {
    next = buildAuto(getAdaptiveProfile());
  } else if (mode === 'manual') {
    // الاحتفاظ بالقيم الحالية مع تغيير الوضع فقط
    const current = loadSettings();
    next = { ...current, mode: 'manual' };
  } else {
    next = { mode, ...PRESETS[mode] };
  }
  saveSettings(next);
  return next;
}

/**
 * يقرر ما إذا كان يجب تشغيل عملية في الخلفية الآن
 * بناءً على الإعدادات وحالة الشبكة الحالية.
 */
export function shouldRunBackgroundTask(): boolean {
  const settings = loadSettings();
  if (!settings.pauseBackgroundOnSlowNetwork) return true;
  const profile = getAdaptiveProfile();
  if (profile.network.saveData) return false;
  if (profile.network.tier === 'slow') return false;
  return true;
}
