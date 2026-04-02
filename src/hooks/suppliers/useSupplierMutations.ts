/**
 * Supplier Mutations Hook — Write operations (CQRS: Command side)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supplierRepository } from "@/lib/repositories/supplierRepository";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { logErrorSafely } from "@/lib/errorHandler";
import type { Database } from "@/integrations/supabase/types";
import type { SortConfig } from "@/hooks/useTableSort";

type Supplier = Database['public']['Tables']['suppliers']['Row'];

interface UseSupplierMutationsOptions {
  filterKey: (string | undefined)[];
  currentPage: number;
  sortConfig: SortConfig;
}

export function useSupplierMutations(options: UseSupplierMutationsOptions) {
  const queryClient = useQueryClient();
  const { filterKey, currentPage, sortConfig } = options;

  const deleteMutation = useMutation({
    mutationFn: async (deleteId: string) => {
      const hasPermission = await verifyPermissionOnServer('suppliers', 'delete');
      if (!hasPermission) throw new Error('ليس لديك صلاحية حذف الموردين');
      await supplierRepository.delete(deleteId);
    },
    onMutate: async (deleteId: string) => {
      await queryClient.cancelQueries({ queryKey: ['suppliers'] });
      const qk = ['suppliers', ...filterKey, currentPage, sortConfig.key, sortConfig.direction];
      const prev = queryClient.getQueryData(qk);
      queryClient.setQueryData(qk, (old: { data: Supplier[]; count: number } | undefined) => {
        if (!old) return old;
        return { data: old.data.filter(s => s.id !== deleteId), count: old.count - 1 };
      });
      return { prev, qk };
    },
    onSuccess: () => toast.success('تم حذف المورد بنجاح'),
    onError: (err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(context.qk, context.prev);
      toast.error(err instanceof Error ? err.message : 'فشل حذف المورد');
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const hasPermission = await verifyPermissionOnServer('suppliers', 'delete');
      if (!hasPermission) throw new Error('ليس لديك صلاحية حذف الموردين');
      await supplierRepository.bulkDelete(ids);
      try {
        await supplierRepository.logBulkOperation('bulk_delete', ids, { count: ids.length });
      } catch (logErr) {
        logErrorSafely('bulkDelete:audit', logErr);
        toast.warning('تعذّر تسجيل العملية في سجل التدقيق');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      toast.success('تم حذف الموردين المحددين بنجاح');
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : 'فشل حذف الموردين المحددين'),
  });

  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, isActive }: { ids: string[]; isActive: boolean }) => {
      const hasPermission = await verifyPermissionOnServer('suppliers', 'edit');
      if (!hasPermission) throw new Error('ليس لديك صلاحية تعديل الموردين');
      await supplierRepository.bulkUpdateStatus(ids, isActive);
    },
    onSuccess: async (_data, { ids, isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      try {
        await supplierRepository.logBulkOperation('bulk_status_update', ids, { is_active: isActive });
      } catch (logErr) {
        logErrorSafely('bulkStatus:audit', logErr);
        toast.warning('تعذّر تسجيل العملية في سجل التدقيق');
      }
      toast.success('تم تحديث حالة الموردين بنجاح');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  return { deleteMutation, bulkDeleteMutation, bulkStatusMutation };
}
