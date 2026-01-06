import { useCallback } from 'react';
import { useUserPreferences } from './useUserPreferences';

export interface NotificationType {
  id: string;
  label: string;
  enabled: boolean;
  sound: boolean;
  email: boolean;
}

export interface NotificationPreferences {
  types: NotificationType[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:mm format
    end: string;
  };
  priority: {
    high: 'sound_popup' | 'popup' | 'badge';
    medium: 'popup' | 'badge';
    low: 'badge' | 'none';
  };
}

const defaultNotificationTypes: NotificationType[] = [
  { id: 'new_invoice', label: 'فاتورة جديدة', enabled: true, sound: true, email: false },
  { id: 'low_stock', label: 'تنبيه مخزون منخفض', enabled: true, sound: true, email: true },
  { id: 'new_order', label: 'طلب جديد', enabled: true, sound: true, email: false },
  { id: 'payment_received', label: 'دفعة مستلمة', enabled: true, sound: false, email: false },
  { id: 'task_assigned', label: 'مهمة جديدة', enabled: true, sound: true, email: true },
  { id: 'task_due', label: 'موعد استحقاق مهمة', enabled: true, sound: true, email: true },
  { id: 'quotation_expired', label: 'عرض سعر منتهي', enabled: true, sound: false, email: false },
  { id: 'invoice_overdue', label: 'فاتورة متأخرة', enabled: true, sound: true, email: true },
];

const defaultPreferences: NotificationPreferences = {
  types: defaultNotificationTypes,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00',
  },
  priority: {
    high: 'sound_popup',
    medium: 'popup',
    low: 'badge',
  },
};

export function useNotificationPreferences() {
  const { preferences, updateNotificationSettings } = useUserPreferences();
  
  const notificationSettings: NotificationPreferences = {
    ...defaultPreferences,
    ...preferences.notification_settings,
    types: preferences.notification_settings?.types || defaultNotificationTypes,
  };

  const updateType = useCallback((typeId: string, updates: Partial<NotificationType>) => {
    const newTypes = notificationSettings.types.map(type =>
      type.id === typeId ? { ...type, ...updates } : type
    );
    updateNotificationSettings({
      ...notificationSettings,
      types: newTypes,
    });
  }, [notificationSettings, updateNotificationSettings]);

  const toggleTypeEnabled = useCallback((typeId: string) => {
    updateType(typeId, { 
      enabled: !notificationSettings.types.find(t => t.id === typeId)?.enabled 
    });
  }, [notificationSettings.types, updateType]);

  const toggleTypeSound = useCallback((typeId: string) => {
    updateType(typeId, { 
      sound: !notificationSettings.types.find(t => t.id === typeId)?.sound 
    });
  }, [notificationSettings.types, updateType]);

  const toggleTypeEmail = useCallback((typeId: string) => {
    updateType(typeId, { 
      email: !notificationSettings.types.find(t => t.id === typeId)?.email 
    });
  }, [notificationSettings.types, updateType]);

  const setQuietHours = useCallback((quietHours: NotificationPreferences['quietHours']) => {
    updateNotificationSettings({
      ...notificationSettings,
      quietHours,
    });
  }, [notificationSettings, updateNotificationSettings]);

  const setPriority = useCallback((priority: NotificationPreferences['priority']) => {
    updateNotificationSettings({
      ...notificationSettings,
      priority,
    });
  }, [notificationSettings, updateNotificationSettings]);

  const resetToDefaults = useCallback(() => {
    updateNotificationSettings(defaultPreferences);
  }, [updateNotificationSettings]);

  return {
    settings: notificationSettings,
    updateType,
    toggleTypeEnabled,
    toggleTypeSound,
    toggleTypeEmail,
    setQuietHours,
    setPriority,
    resetToDefaults,
  };
}
