import { usePersistentState } from '@/hooks/usePersistentState';

export type QuickActionSize = 'small' | 'medium';

/**
 * تفضيل حجم أزرار الاستجابة السريعة (صغير/متوسط)
 * يُحفظ في localStorage تلقائياً.
 */
export function useQuickActionSize() {
  const [size, setSize] = usePersistentState<QuickActionSize>(
    'dashboard:quick-action-size',
    'medium',
    { version: 1 },
  );

  const toggle = () =>
    setSize((prev) => (prev === 'small' ? 'medium' : 'small'));

  return { size, setSize, toggle, isSmall: size === 'small' };
}

export function getQuickActionClasses(size: QuickActionSize) {
  if (size === 'small') {
    return {
      button: 'h-7 w-7',
      icon: 'h-3 w-3',
      gap: 'gap-1',
    };
  }
  return {
    button: 'h-8 w-8',
    icon: 'h-3.5 w-3.5',
    gap: 'gap-1.5',
  };
}
