import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { WidgetConfig } from '@/components/dashboard/DraggableWidget';

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
      return data;
    },
    enabled: !!user?.id,
  });

  const widgets: WidgetConfig[] = settings?.widgets 
    ? (settings.widgets as unknown as WidgetConfig[])
    : DEFAULT_WIDGETS;

  const mutation = useMutation({
    mutationFn: async (newWidgets: WidgetConfig[]) => {
      if (!user?.id) throw new Error('No user');

      const { error } = await supabase
        .from('user_dashboard_settings')
        .upsert({
          user_id: user.id,
          widgets: newWidgets as unknown as Record<string, unknown>,
        } as any, {
          onConflict: 'user_id',
        });

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
