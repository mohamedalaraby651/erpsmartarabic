import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export type PlatformRole = 'super_admin' | 'support' | 'billing';

export interface UsePlatformAdminReturn {
  isPlatformAdmin: boolean;
  platformRole: PlatformRole | null;
  isLoading: boolean;
}

export function usePlatformAdmin(): UsePlatformAdminReturn {
  const { user } = useAuth();

  const { data: platformRole, isLoading } = useQuery({
    queryKey: ['platform-admin', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('get_platform_role', {
        _user_id: user.id,
      });
      if (error) return null;
      return data as PlatformRole | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return {
    isPlatformAdmin: !!platformRole,
    platformRole: platformRole ?? null,
    isLoading,
  };
}
