import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface PermissionMatrix {
  is_admin: boolean;
  role_id?: string;
  sections: Record<string, { view: boolean; create: boolean; edit: boolean; delete: boolean }> | '*';
}

/**
 * Reads the cached permission matrix for the current user.
 * Falls back gracefully — UI hint only; always re-verify server-side for sensitive ops.
 */
export function usePermissionMatrix() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['permission-matrix', user?.id],
    queryFn: async (): Promise<PermissionMatrix | null> => {
      if (!user?.id) return null;
      const { data, error } = await supabase.rpc('get_permission_matrix', { _user_id: user.id });
      if (error) {
        console.warn('[usePermissionMatrix] error:', error.message);
        return null;
      }
      return data as unknown as PermissionMatrix;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
