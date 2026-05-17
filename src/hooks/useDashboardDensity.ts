import { usePersistentState } from '@/hooks/usePersistentState';

export type DashboardDensity = 'comfortable' | 'compact';

/**
 * تفضيل كثافة عرض لوحة التحكم (مضغوط / عادي).
 * يُحفظ في localStorage ويُطبَّق عبر `data-density` على جذر الصفحة.
 */
export function useDashboardDensity() {
  const [density, setDensity] = usePersistentState<DashboardDensity>(
    'dashboard:density',
    'comfortable',
    { version: 1 },
  );

  const toggle = () =>
    setDensity((prev) => (prev === 'compact' ? 'comfortable' : 'compact'));

  return { density, setDensity, toggle, isCompact: density === 'compact' };
}
