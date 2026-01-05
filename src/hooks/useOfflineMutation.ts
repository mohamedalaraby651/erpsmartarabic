import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useOnlineStatus } from './useOnlineStatus';
import { addToSyncQueue, getCachedData, cacheData } from '@/lib/offlineStorage';
import { useToast } from './use-toast';
import { getSafeErrorMessage, logErrorSafely } from '@/lib/errorHandler';

type TableName = 'customers' | 'products' | 'invoices' | 'quotations' | 'suppliers';

interface MutationOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useOfflineMutation(
  table: TableName,
  options: MutationOptions = {}
) {
  const isOnline = useOnlineStatus();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const insertMutation = useMutation({
    mutationFn: async (data: Record<string, any>) => {
      const id = crypto.randomUUID();
      const newData = { ...data, id };

      if (isOnline) {
        const { data: result, error } = await supabase
          .from(table)
          .insert(newData as any)
          .select()
          .maybeSingle();

        if (error) throw error;
        return result;
      }

      const cachedData = await getCachedData(table);
      await cacheData(table, [...cachedData, newData]);
      await addToSyncQueue(table, 'insert', newData);

      toast({
        title: 'تم الحفظ محلياً',
        description: 'سيتم المزامنة عند الاتصال بالإنترنت',
      });

      return newData;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      options.onSuccess?.(data);
    },
    onError: (error: Error) => {
      logErrorSafely('useOfflineMutation.insert', error);
      toast({ title: 'خطأ', description: getSafeErrorMessage(error), variant: 'destructive' });
      options.onError?.(error);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      if (isOnline) {
        const { data: result, error } = await supabase
          .from(table)
          .update(data as any)
          .eq('id', id)
          .select()
          .maybeSingle();

        if (error) throw error;
        return result;
      }

      const cachedData = await getCachedData(table);
      const updatedData = cachedData.map((item: any) =>
        item.id === id ? { ...item, ...data } : item
      );
      await cacheData(table, updatedData);
      await addToSyncQueue(table, 'update', { id, ...data });

      toast({
        title: 'تم التحديث محلياً',
        description: 'سيتم المزامنة عند الاتصال بالإنترنت',
      });

      return { id, ...data };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      options.onSuccess?.(data);
    },
    onError: (error: Error) => {
      logErrorSafely('useOfflineMutation.update', error);
      toast({ title: 'خطأ', description: getSafeErrorMessage(error), variant: 'destructive' });
      options.onError?.(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      if (isOnline) {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        return { id };
      }

      const cachedData = await getCachedData(table);
      const filteredData = cachedData.filter((item: any) => item.id !== id);
      await cacheData(table, filteredData);
      await addToSyncQueue(table, 'delete', { id });

      toast({
        title: 'تم الحذف محلياً',
        description: 'سيتم المزامنة عند الاتصال بالإنترنت',
      });

      return { id };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [table] });
      options.onSuccess?.(data);
    },
    onError: (error: Error) => {
      logErrorSafely('useOfflineMutation.delete', error);
      toast({ title: 'خطأ', description: getSafeErrorMessage(error), variant: 'destructive' });
      options.onError?.(error);
    },
  });

  return {
    insert: insertMutation.mutate,
    update: updateMutation.mutate,
    delete: deleteMutation.mutate,
    isInserting: insertMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isPending: insertMutation.isPending || updateMutation.isPending || deleteMutation.isPending,
  };
}
