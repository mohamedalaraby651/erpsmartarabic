/**
 * Customer Mutations Hook — Write operations (CQRS: Command side)
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { customerRepository } from "@/lib/repositories/customerRepository";
import { canDeleteCustomer } from "@/lib/services/customerService";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { logErrorSafely } from "@/lib/errorHandler";
import type { Customer } from "@/lib/customerConstants";
import type { SortConfig } from "@/hooks/useTableSort";

interface UseCustomerMutationsOptions {
  filterKey: (string | undefined)[];
  currentPage: number;
  sortConfig: SortConfig;
}

export function useCustomerMutations(options: UseCustomerMutationsOptions) {
  const queryClient = useQueryClient();
  const { filterKey, currentPage, sortConfig } = options;

  // Single delete with optimistic update
  const deleteMutation = useMutation({
    mutationFn: async (deleteId: string) => {
      const hasPermission = await canDeleteCustomer();
      if (!hasPermission) throw new Error('ليس لديك صلاحية حذف العملاء');
      await customerRepository.delete(deleteId);
    },
    onMutate: async (deleteId: string) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      const qk = ['customers', ...filterKey, currentPage, sortConfig.key, sortConfig.direction];
      const prev = queryClient.getQueryData(qk);
      queryClient.setQueryData(qk, (old: { data: Customer[]; count: number } | undefined) => {
        if (!old) return old;
        return {
          data: old.data.filter(c => c.id !== deleteId),
          count: old.count - 1,
        };
      });
      return { prev, qk };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      toast.success('تم حذف العميل بنجاح');
    },
    onError: (err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(context.qk, context.prev);
      toast.error(err instanceof Error ? err.message : 'فشل حذف العميل');
    },
  });

  // Bulk delete with batch validation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const hasPermission = await canDeleteCustomer();
      if (!hasPermission) throw new Error('ليس لديك صلاحية حذف العملاء');

      const blocked = await customerRepository.batchValidateDelete(ids);
      if (blocked && blocked.length > 0) {
        const names = blocked
          .map(b => `${b.customer_name} (${b.open_invoice_count} فاتورة)`)
          .join('، ');
        throw new Error(`لا يمكن حذف العملاء التالية لوجود فواتير مفتوحة: ${names}`);
      }

      await customerRepository.bulkDelete(ids);

      try {
        await customerRepository.logBulkOperation('bulk_delete', ids, { count: ids.length });
      } catch (logErr) {
        logErrorSafely('bulkDelete:audit', logErr);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      toast.success('تم حذف العملاء المحددين بنجاح');
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'فشل حذف العملاء المحددين');
    },
  });

  // Bulk VIP update
  const bulkVipMutation = useMutation({
    mutationFn: async ({ ids, vipLevel }: { ids: string[]; vipLevel: string }) => {
      const hasPermission = await verifyPermissionOnServer('customers', 'edit');
      if (!hasPermission) throw new Error('ليس لديك صلاحية تعديل العملاء');
      await customerRepository.bulkUpdateVip(ids, vipLevel);
    },
    onSuccess: async (_data, { ids, vipLevel }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      try {
        await customerRepository.logBulkOperation('bulk_vip_update', ids, { vip_level: vipLevel });
      } catch (logErr) { logErrorSafely('bulkVip:audit', logErr); }
      toast.success('تم تحديث مستوى VIP بنجاح');
    },
    onError: () => toast.error('فشل تحديث مستوى VIP'),
  });

  // Bulk status update
  const bulkStatusMutation = useMutation({
    mutationFn: async ({ ids, isActive }: { ids: string[]; isActive: boolean }) => {
      const hasPermission = await verifyPermissionOnServer('customers', 'edit');
      if (!hasPermission) throw new Error('ليس لديك صلاحية تعديل العملاء');
      await customerRepository.bulkUpdateStatus(ids, isActive);
    },
    onSuccess: async (_data, { ids, isActive }) => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      try {
        await customerRepository.logBulkOperation('bulk_status_update', ids, { is_active: isActive });
      } catch (logErr) { logErrorSafely('bulkStatus:audit', logErr); }
      toast.success('تم تحديث حالة العملاء بنجاح');
    },
    onError: () => toast.error('فشل تحديث الحالة'),
  });

  return {
    deleteMutation,
    bulkDeleteMutation,
    bulkVipMutation,
    bulkStatusMutation,
  };
}
