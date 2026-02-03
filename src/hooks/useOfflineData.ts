import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { getCachedData, cacheData } from '@/lib/offlineStorage';

type TableName = 'customers' | 'products' | 'invoices' | 'quotations' | 'suppliers';

interface UseOfflineDataOptions {
  enabled?: boolean;
  orderBy?: string;
  limit?: number;
}

export function useOfflineData<T>(
  table: TableName,
  options: UseOfflineDataOptions = {}
) {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const { enabled = true, orderBy = 'created_at', limit } = options;

  return useQuery({
    queryKey: [table, { orderBy, limit }],
    queryFn: async (): Promise<T[]> => {
      // If online, fetch from Supabase and cache locally
      if (isOnline) {
        let query = supabase.from(table).select('*');
        
        if (orderBy) {
          query = query.order(orderBy, { ascending: false });
        }
        
        if (limit) {
          query = query.limit(limit);
        }

        const { data, error } = await query;
        
        if (error) {
          console.error(`Error fetching ${table}:`, error);
          // Fall back to cached data on error
          const cachedData = await getCachedData(table);
          return cachedData as T[];
        }

        // Cache the fetched data
        if (data && data.length > 0) {
          await cacheData(table, data);
        }

        return (data || []) as T[];
      }

      // If offline, get from cache
      const cachedData = await getCachedData(table);
      return cachedData as T[];
    },
    enabled,
    staleTime: isOnline ? 1000 * 60 : Infinity, // 1 minute when online, never stale when offline
    gcTime: 1000 * 60 * 30, // 30 minutes
  });
}

export function useOfflineItem<T>(
  table: TableName,
  id: string | undefined,
  options: { enabled?: boolean } = {}
) {
  const isOnline = useOnlineStatus();
  const { enabled = true } = options;

  return useQuery({
    queryKey: [table, id],
    queryFn: async (): Promise<T | null> => {
      if (!id) return null;

      if (isOnline) {
        const { data, error } = await supabase
          .from(table)
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error(`Error fetching ${table} item:`, error);
          // Try cache
          const cachedData = await getCachedData(table);
          const item = cachedData.find((cached: { id: string }) => cached.id === id);
          return (item as T) || null;
        }

        return data as T;
      }

      // Offline: get from cache
      const cachedData = await getCachedData(table);
      const item = cachedData.find((cached: { id: string }) => cached.id === id);
      return (item as T) || null;
    },
    enabled: enabled && !!id,
  });
}
