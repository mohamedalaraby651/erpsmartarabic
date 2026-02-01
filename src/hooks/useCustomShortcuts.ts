import { useState, useEffect, useCallback } from 'react';

export interface ShortcutDefinition {
  id: string;
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  description: string;
  action: string; // navigation path or action name
  category: 'navigation' | 'action' | 'global';
  enabled: boolean;
}

// الاختصارات الافتراضية
export const defaultShortcuts: ShortcutDefinition[] = [
  // التنقل
  { id: 'nav-home', key: '1', altKey: true, description: 'الرئيسية', action: '/', category: 'navigation', enabled: true },
  { id: 'nav-customers', key: '2', altKey: true, description: 'العملاء', action: '/customers', category: 'navigation', enabled: true },
  { id: 'nav-products', key: '3', altKey: true, description: 'المنتجات', action: '/products', category: 'navigation', enabled: true },
  { id: 'nav-invoices', key: '4', altKey: true, description: 'الفواتير', action: '/invoices', category: 'navigation', enabled: true },
  { id: 'nav-orders', key: '5', altKey: true, description: 'أوامر البيع', action: '/sales-orders', category: 'navigation', enabled: true },
  { id: 'nav-reports', key: '6', altKey: true, description: 'التقارير', action: '/reports', category: 'navigation', enabled: true },
  { id: 'nav-settings', key: '7', altKey: true, description: 'الإعدادات', action: '/settings', category: 'navigation', enabled: true },
  
  // الإجراءات العامة
  { id: 'search', key: 'k', ctrlKey: true, description: 'البحث الشامل', action: '/search', category: 'global', enabled: true },
  { id: 'help', key: '/', ctrlKey: true, description: 'عرض الاختصارات', action: 'show-shortcuts', category: 'global', enabled: true },
  { id: 'new-item', key: 'n', ctrlKey: true, description: 'إنشاء جديد', action: 'new-item', category: 'action', enabled: true },
  { id: 'save', key: 's', ctrlKey: true, description: 'حفظ', action: 'save', category: 'action', enabled: true },
  { id: 'print', key: 'p', ctrlKey: true, description: 'طباعة', action: 'print', category: 'action', enabled: true },
  { id: 'export', key: 'e', ctrlKey: true, description: 'تصدير', action: 'export', category: 'action', enabled: true },
];

interface UseCustomShortcutsOptions {
  storageKey?: string;
}

interface UseCustomShortcutsReturn {
  shortcuts: ShortcutDefinition[];
  updateShortcut: (id: string, updates: Partial<ShortcutDefinition>) => void;
  resetToDefault: () => void;
  toggleShortcut: (id: string) => void;
  getShortcutLabel: (shortcut: ShortcutDefinition) => string;
  findShortcutByKey: (key: string, modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean }) => ShortcutDefinition | undefined;
}

export function useCustomShortcuts(options: UseCustomShortcutsOptions = {}): UseCustomShortcutsReturn {
  const { storageKey = 'custom-shortcuts' } = options;

  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>(() => {
    if (typeof window === 'undefined') return defaultShortcuts;
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        // دمج مع الاختصارات الافتراضية للحفاظ على الجديدة
        return defaultShortcuts.map(defaultShortcut => {
          const customized = parsed.find((s: ShortcutDefinition) => s.id === defaultShortcut.id);
          return customized ? { ...defaultShortcut, ...customized } : defaultShortcut;
        });
      }
    } catch {
      // تجاهل الأخطاء
    }
    return defaultShortcuts;
  });

  // حفظ في localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify(shortcuts));
    } catch (e) {
      console.warn('Failed to save shortcuts:', e);
    }
  }, [shortcuts, storageKey]);

  // تحديث اختصار
  const updateShortcut = useCallback((id: string, updates: Partial<ShortcutDefinition>) => {
    setShortcuts(prev => 
      prev.map(s => s.id === id ? { ...s, ...updates } : s)
    );
  }, []);

  // إعادة للافتراضي
  const resetToDefault = useCallback(() => {
    setShortcuts(defaultShortcuts);
  }, []);

  // تفعيل/تعطيل اختصار
  const toggleShortcut = useCallback((id: string) => {
    setShortcuts(prev =>
      prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
    );
  }, []);

  // الحصول على تسمية الاختصار
  const getShortcutLabel = useCallback((shortcut: ShortcutDefinition): string => {
    const parts: string[] = [];
    if (shortcut.ctrlKey) parts.push('Ctrl');
    if (shortcut.altKey) parts.push('Alt');
    if (shortcut.shiftKey) parts.push('Shift');
    parts.push(shortcut.key.toUpperCase());
    return parts.join('+');
  }, []);

  // البحث عن اختصار بالمفتاح
  const findShortcutByKey = useCallback((
    key: string, 
    modifiers: { ctrl?: boolean; alt?: boolean; shift?: boolean }
  ): ShortcutDefinition | undefined => {
    return shortcuts.find(s => 
      s.enabled &&
      s.key.toLowerCase() === key.toLowerCase() &&
      !!s.ctrlKey === !!modifiers.ctrl &&
      !!s.altKey === !!modifiers.alt &&
      !!s.shiftKey === !!modifiers.shift
    );
  }, [shortcuts]);

  return {
    shortcuts,
    updateShortcut,
    resetToDefault,
    toggleShortcut,
    getShortcutLabel,
    findShortcutByKey,
  };
}
