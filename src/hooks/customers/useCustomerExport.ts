import { useCallback } from 'react';
import { verifyPermissionOnServer } from '@/lib/api/secureOperations';
import type { Customer } from '@/lib/customerConstants';
import type { ExportOptions } from '@/components/customers/dialogs/CustomerExportDialog';
import { customerRepository } from '@/lib/repositories/customerRepository';
import { customerSearchRepo } from '@/lib/repositories/customerSearchRepo';

interface UseCustomerExportParams {
  filters: {
    debouncedSearch: string;
    typeFilter: string;
    vipFilter: string;
    governorateFilter: string;
    statusFilter: string;
    noCommDays?: number;
    inactiveDays?: number;
  };
  sortConfig: { key: string; direction: 'asc' | 'desc' | null };
}

const HEADER_MAP: Record<string, string> = {
  name: 'الاسم', customer_type: 'النوع', vip_level: 'مستوى VIP',
  phone: 'الهاتف', phone2: 'هاتف 2', email: 'البريد',
  governorate: 'المحافظة', city: 'المدينة',
  current_balance: 'الرصيد', credit_limit: 'حد الائتمان',
  is_active: 'الحالة', total_purchases_cached: 'إجمالي المشتريات',
  last_activity_at: 'آخر نشاط', created_at: 'تاريخ الإضافة',
  tax_number: 'الرقم الضريبي', notes: 'ملاحظات',
};

export function useCustomerExport({ filters, sortConfig }: UseCustomerExportParams) {
  const handleExport = useCallback(async (options: ExportOptions) => {
    const hasPermission = await verifyPermissionOnServer('customers', 'view');
    if (!hasPermission) {
      const { toast: sonnerToast } = await import('sonner');
      sonnerToast.error('غير مصرح لك بتصدير بيانات العملاء');
      return;
    }

    const { toast: sonnerToast } = await import('sonner');
    const toastId = 'export-advanced';
    sonnerToast.loading('جاري تحضير التصدير...', { id: toastId });

    try {
      const { customerRepository } = await import('@/lib/repositories/customerRepository');

      let data: Customer[];
      const hasFilters = filters.debouncedSearch || filters.typeFilter !== 'all' || filters.vipFilter !== 'all' || filters.governorateFilter !== 'all' || filters.statusFilter !== 'all';

      if (options.scope === 'filtered' && hasFilters) {
        const result = await customerRepository.findAll(
          {
            search: filters.debouncedSearch,
            type: filters.typeFilter,
            vip: filters.vipFilter,
            governorate: filters.governorateFilter,
            status: filters.statusFilter,
            noCommDays: filters.noCommDays != null ? String(filters.noCommDays) : undefined,
            inactiveDays: filters.inactiveDays != null ? String(filters.inactiveDays) : undefined,
          },
          { key: sortConfig.key || 'created_at', direction: sortConfig.direction },
          { page: 1, pageSize: 5000 }
        );
        data = result.data || [];
      } else {
        const result = await customerRepository.exportAll((loaded) => {
          sonnerToast.loading(`جاري تحميل ${loaded.toLocaleString()} عميل...`, { id: toastId });
        });
        data = (result.data || []) as Customer[];
      }

      if (!data.length) {
        sonnerToast.error('لا توجد بيانات للتصدير', { id: toastId });
        return;
      }

      const selectedCols = options.columns.filter(c => HEADER_MAP[c]);
      const exportData = data.map(row => {
        const mapped: Record<string, unknown> = {};
        selectedCols.forEach(key => {
          mapped[HEADER_MAP[key]] = (row as Record<string, unknown>)[key];
        });
        return mapped;
      });

      if (options.format === 'csv') {
        exportAsCsv(exportData, selectedCols);
      } else if (options.format === 'pdf') {
        await exportAsPdf(exportData, selectedCols);
      } else {
        await exportAsExcel(exportData, selectedCols);
      }

      sonnerToast.success(`تم تصدير ${data.length} عميل بنجاح`, { id: toastId });
    } catch {
      sonnerToast.error('حدث خطأ أثناء التصدير', { id: toastId });
    }
  }, [filters, sortConfig]);

  return { handleExport };
}

function exportAsCsv(data: Record<string, unknown>[], cols: string[]) {
  const headers = cols.map(c => HEADER_MAP[c]);
  const csvRows = [headers.join(',')];
  data.forEach(row => {
    csvRows.push(headers.map(h => {
      const val = row[h];
      const str = val == null ? '' : String(val);
      return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
    }).join(','));
  });
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `customers_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportAsPdf(data: Record<string, unknown>[], cols: string[]) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');
  const doc = new jsPDF({ orientation: 'landscape', putOnlyUsedFonts: true });
  const headers = cols.map(c => HEADER_MAP[c]);
  const body = data.map(row => headers.map(h => String(row[h] ?? '')));
  autoTable(doc, {
    head: [headers],
    body,
    styles: { font: 'helvetica', fontSize: 8, halign: 'right' },
    headStyles: { fillColor: [59, 130, 246] },
  });
  doc.save(`customers_${new Date().toISOString().slice(0, 10)}.pdf`);
}

async function exportAsExcel(data: Record<string, unknown>[], cols: string[]) {
  const XLSX = await import('xlsx');
  const ws = XLSX.utils.json_to_sheet(data);
  const headers = cols.map(c => HEADER_MAP[c]);
  ws['!cols'] = headers.map(h => ({ wch: Math.max(h.length, 15) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
  XLSX.writeFile(wb, `customers_${new Date().toISOString().slice(0, 10)}.xlsx`);
}
