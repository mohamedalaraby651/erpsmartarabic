import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { WidgetConfig } from '@/components/dashboard/DraggableWidget';
import { useEffect, useState } from 'react';

const STORAGE_KEY = 'dashboard_widgets';

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'stats', title: 'الإحصائيات', enabled: true, order: 0, size: 'full' },
  { id: 'quick_actions', title: 'الإجراءات السريعة', enabled: true, order: 1, size: 'full' },
  { id: 'chart', title: 'الرسم البياني', enabled: true, order: 2, size: 'half' },
  { id: 'tasks', title: 'المهام', enabled: true, order: 3, size: 'half' },
  { id: 'activities', title: 'آخر الأنشطة', enabled: true, order: 4, size: 'full' },
];

export function useDashboardSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [localWidgets, setLocalWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);

  // Load from localStorage first
  useEffect(() => {
    if (!user?.id) return;
    
    const stored = localStorage.getItem(`${STORAGE_KEY}_${user.id}`);
    if (stored) {
      try {
        setLocalWidgets(JSON.parse(stored));
      } catch {
        setLocalWidgets(DEFAULT_WIDGETS);
      }
    }
  }, [user?.id]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['dashboard-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('user_dashboard_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      
      // Update localStorage with DB data
      if (data?.widgets) {
        const dbWidgets = data.widgets as unknown as WidgetConfig[];
        localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(dbWidgets));
        setLocalWidgets(dbWidgets);
      }
      
      return data;
    },
    enabled: !!user?.id,
  });

  const widgets: WidgetConfig[] = settings?.widgets 
    ? (settings.widgets as unknown as WidgetConfig[])
    : localWidgets;

  const mutation = useMutation({
    mutationFn: async (newWidgets: WidgetConfig[]) => {
      if (!user?.id) throw new Error('No user');

      // Save to localStorage first (fast)
      localStorage.setItem(`${STORAGE_KEY}_${user.id}`, JSON.stringify(newWidgets));
      setLocalWidgets(newWidgets);

      // Then save to database
      const { error } = await supabase
        .from('user_dashboard_settings')
        .upsert([
          {
            user_id: user.id,
            widgets: JSON.stringify(newWidgets),
          },
        ], { onConflict: 'user_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-settings', user?.id] });
    },
  });

  return {
    widgets,
    isLoading,
    updateWidgets: mutation.mutate,
    isSaving: mutation.isPending,
  };
}
