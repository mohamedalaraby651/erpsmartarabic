import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDuplicateInvoice } from "@/hooks/useDuplicateInvoice";
import { logErrorSafely } from "@/lib/errorHandler";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceWithCustomer = Invoice & { customers: { name: string } | null };

const PAGE_SIZE = 25;

export function useInvoicesList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const { duplicate, isDuplicating } = useDuplicateInvoice();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [prefillCustomerId, setPrefillCustomerId] = useState<string | undefined>(undefined);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);
  // Bulk-selection state for batch printing / actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const bulkPrint = useCallback(async () => {
    if (selectedIds.size === 0) {
      toast({ title: 'لم يتم تحديد فواتير', variant: 'destructive' });
      return;
    }
    setIsBulkPrinting(true);
    try {
      const { generateBulkInvoicesPDF } = await import('@/lib/bulkInvoicePdfGenerator');
      await generateBulkInvoicesPDF(Array.from(selectedIds));
      toast({ title: `تم تجهيز ${selectedIds.size} فاتورة في PDF واحد` });
      clearSelection();
    } catch (e) {
      logErrorSafely('InvoicesPage.bulkPrint', e);
      toast({ title: 'فشل توليد ملف PDF', variant: 'destructive' });
    } finally {
      setIsBulkPrinting(false);
    }
  }, [selectedIds, toast, clearSelection]);

  const canEdit = userRole === 'admin' || userRole === 'sales' || userRole === 'accountant';
  const canDelete = userRole === 'admin';

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    const state = location.state as { prefillCustomerId?: string } | null;
    if (state?.prefillCustomerId) {
      setPrefillCustomerId(state.prefillCustomerId);
      setSelectedInvoice(null);
      setDialogOpen(true);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const { data: totalCount = 0 } = useQuery({
    queryKey: ['invoices-count', debouncedSearch],
    queryFn: async () => {
      let query = supabase.from('invoices').select('*', { count: 'exact', head: true });
      if (debouncedSearch) query = query.or(`invoice_number.ilike.%${debouncedSearch}%`);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });

  useEffect(() => { pagination.resetPage(); }, [debouncedSearch]);

  const { data: invoices = [], isLoading, refetch } = useQuery({
    queryKey: ['invoices', debouncedSearch, pagination.currentPage],
    queryFn: async () => {
      let query = supabase.from('invoices').select('*, customers(name)')
        .order('created_at', { ascending: false })
        .range(pagination.range.from, pagination.range.to);
      if (debouncedSearch) query = query.or(`invoice_number.ilike.%${debouncedSearch}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['invoices-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.from('invoices').select('total_amount, paid_amount, payment_status');
      if (error) throw error;
      const all = data || [];
      return {
        total: all.length,
        unpaid: all.filter((i) => i.payment_status === 'pending').length,
        totalValue: all.reduce((sum, i) => sum + Number(i.total_amount), 0),
        unpaidValue: all.filter((i) => i.payment_status !== 'paid')
          .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.paid_amount || 0)), 0),
      };
    },
    staleTime: 30000,
  });

  const invoiceStats = stats || { total: 0, unpaid: 0, totalValue: 0, unpaidValue: 0 };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { deleteInvoice } = await import('@/lib/services/invoiceService');
      await deleteInvoice(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-count'] });
      queryClient.invalidateQueries({ queryKey: ['invoices-stats'] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast({ title: "تم حذف الفاتورة بنجاح" });
    },
    onError: (error) => {
      if (error.message === 'UNAUTHORIZED') {
        toast({ title: "غير مصرح", description: "ليس لديك صلاحية حذف الفواتير", variant: "destructive" });
      } else {
        toast({ title: "خطأ في حذف الفاتورة", variant: "destructive" });
      }
      logErrorSafely('InvoicesPage.delete', error);
    },
  });

  const { filteredData, filters, setFilter } = useTableFilter(invoices);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const handleEdit = useCallback((invoice: Invoice) => { setSelectedInvoice(invoice); setDialogOpen(true); }, []);
  const handleAdd = useCallback(() => { setSelectedInvoice(null); setDialogOpen(true); }, []);
  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const statItems = useMemo(() => [
    { label: 'إجمالي الفواتير', value: invoiceStats.total, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'غير مدفوعة', value: invoiceStats.unpaid, color: 'text-destructive', bgColor: 'bg-destructive/10' },
    { label: 'إجمالي المبيعات', value: `${invoiceStats.totalValue.toLocaleString()}`, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'مستحق التحصيل', value: `${invoiceStats.unpaidValue.toLocaleString()}`, color: 'text-warning', bgColor: 'bg-warning/10' },
  ], [invoiceStats]);

  return {
    searchQuery, setSearchQuery, debouncedSearch,
    dialogOpen, setDialogOpen, selectedInvoice, prefillCustomerId, setPrefillCustomerId,
    printDialogOpen, setPrintDialogOpen, printInvoiceId, setPrintInvoiceId,
    canEdit, canDelete, invoices, isLoading, sortedData, sortConfig, requestSort,
    filters, setFilter, deleteMutation, handleEdit, handleAdd, handleRefresh,
    statItems, invoiceStats, pagination, totalCount, duplicate, isDuplicating,
    PAGE_SIZE,
  };
}
