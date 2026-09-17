import { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useTableSort } from "@/hooks/useTableSort";
import { useColumnFilters } from "@/hooks/useColumnFilters";
import { applyColumnFilters } from "@/lib/filters/applyColumnFilters";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useDuplicateInvoice } from "@/hooks/useDuplicateInvoice";
import { logErrorSafely } from "@/lib/errorHandler";
import { sanitizeSearch } from "@/lib/utils/sanitize";
import type { Database } from "@/integrations/supabase/types";

type Invoice = Database['public']['Tables']['invoices']['Row'];
export type InvoiceWithCustomer = Invoice & { customers: { name: string } | null };

const PAGE_SIZE = 25;

/** Maps a UI column id to the database column its filter targets. */
const INVOICE_FILTER_COLUMNS: Record<string, string> = {
  invoice_number: 'invoice_number',
  customer_name: 'customers.name',
  created_at: 'created_at',
  total_amount: 'total_amount',
  paid_amount: 'paid_amount',
  payment_status: 'payment_status',
  approval_status: 'approval_status',
};

export function useInvoicesList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const { toast } = useToast();
  const { duplicate, isDuplicating } = useDuplicateInvoice();

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const normalizedSearch = sanitizeSearch(debouncedSearch.trim());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [prefillCustomerId, setPrefillCustomerId] = useState<string | undefined>(undefined);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printInvoiceId, setPrintInvoiceId] = useState<string | null>(null);
  // Bulk-selection state for batch printing / actions
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkPrinting, setIsBulkPrinting] = useState(false);
  const [isSelectingAll, setIsSelectingAll] = useState(false);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => setSelectedIds(new Set()), []);

  const { data: matchingCustomerIds = [], isFetched: customerSearchResolved } = useQuery({
    queryKey: ['invoice-search-customer-ids', normalizedSearch],
    queryFn: async () => {
      if (!normalizedSearch) return [];
      const { data, error } = await supabase
        .from('customers')
        .select('id')
        .ilike('name', `%${normalizedSearch}%`)
        .limit(500);
      if (error) throw error;
      return (data || []).map((customer) => customer.id);
    },
    enabled: !!normalizedSearch,
    staleTime: 60 * 1000,
  });

  const globalSearchExpression = useMemo(() => {
    if (!normalizedSearch) return '';
    const predicates = [`invoice_number.ilike.%${normalizedSearch}%`];
    if (matchingCustomerIds.length > 0) {
      predicates.push(`customer_id.in.(${matchingCustomerIds.join(',')})`);
    }
    return predicates.join(',');
  }, [matchingCustomerIds, normalizedSearch]);



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

  // Column filters are applied server-side so they narrow the whole result
  // set (every page), not just the rows already loaded.
  const columnFilters = useColumnFilters();
  const filtersKey = JSON.stringify(columnFilters.filters);
  const customerFiltered = !!columnFilters.filters.customer_name;
  const invoiceSelect = customerFiltered ? '*, customers!inner(name)' : '*, customers(name)';

  /**
   * Select every invoice that matches the CURRENT search term AND the active
   * column filters across all pages (IDs only, capped at 500). Must stay in sync
   * with the list/count queries, otherwise bulk actions hit unfiltered rows.
   */
  const selectAllFiltered = useCallback(async () => {
    setIsSelectingAll(true);
    try {
      let query = supabase
        .from('invoices')
        .select(customerFiltered ? 'id, customers!inner(name)' : 'id')
        .limit(500);
      if (globalSearchExpression) query = query.or(globalSearchExpression);
      query = applyColumnFilters(query, columnFilters.filters, INVOICE_FILTER_COLUMNS);
      const { data, error } = await query;
      if (error) throw error;
      const ids = ((data || []) as Array<{ id: string }>).map((r) => r.id);
      setSelectedIds(new Set(ids));
      if (ids.length === 500) {
        toast({ title: 'تم تحديد أول 500 فاتورة فقط', description: 'استخدم البحث لتضييق النتائج', variant: 'default' });
      } else {
        toast({ title: `تم تحديد ${ids.length} فاتورة` });
      }
    } catch (e) {
      logErrorSafely('InvoicesPage.selectAllFiltered', e);
      toast({ title: 'فشل تحديد الفواتير', variant: 'destructive' });
    } finally {
      setIsSelectingAll(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalSearchExpression, filtersKey, customerFiltered, toast]);

  const { data: totalCount = 0 } = useQuery({
    queryKey: ['invoices-count', debouncedSearch, filtersKey],
    queryFn: async () => {
      let query = supabase
        .from('invoices')
        .select(invoiceSelect, { count: 'exact', head: true });
      if (globalSearchExpression) query = query.or(globalSearchExpression);
      query = applyColumnFilters(query, columnFilters.filters, INVOICE_FILTER_COLUMNS);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    enabled: !normalizedSearch || customerSearchResolved,
  });

  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });

  useEffect(() => { pagination.resetPage(); }, [debouncedSearch, filtersKey]);

  const { data: invoices = [], isLoading, refetch, error } = useQuery({
    queryKey: ['invoices', debouncedSearch, filtersKey, pagination.currentPage],
    queryFn: async () => {
      let query = supabase.from('invoices').select(invoiceSelect)
        .order('created_at', { ascending: false })
        .range(pagination.range.from, pagination.range.to);
      if (globalSearchExpression) query = query.or(globalSearchExpression);
      query = applyColumnFilters(query, columnFilters.filters, INVOICE_FILTER_COLUMNS);
      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as InvoiceWithCustomer[];
    },
    enabled: !normalizedSearch || customerSearchResolved,
  });

  // Filter pick-lists (OPA-UI-003 / FLT-001) — every searchable column offers
  // its existing values so several can be selected at once. Read-only lookups.
  const { data: customerOptions = [], isLoading: customerOptionsLoading } = useQuery({
    queryKey: ['invoice-filter-options', 'customers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('customers')
        .select('name')
        .order('name')
        .limit(500);
      if (error) throw error;
      const names = Array.from(new Set((data || []).map((r) => r.name).filter(Boolean)));
      return names.map((n) => ({ value: n as string, label: n as string }));
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: invoiceNumberOptions = [], isLoading: invoiceNumberOptionsLoading } = useQuery({
    queryKey: ['invoice-filter-options', 'invoice-numbers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('invoices')
        .select('invoice_number')
        .order('created_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      const numbers = Array.from(new Set((data || []).map((r) => r.invoice_number).filter(Boolean)));
      return numbers.map((n) => ({ value: n as string, label: n as string }));
    },
    staleTime: 5 * 60 * 1000,
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
        partial: all.filter((i) => i.payment_status === 'partial').length,
        paid: all.filter((i) => i.payment_status === 'paid').length,
        totalValue: all.reduce((sum, i) => sum + Number(i.total_amount), 0),
        unpaidValue: all.filter((i) => i.payment_status !== 'paid')
          .reduce((sum, i) => sum + (Number(i.total_amount) - Number(i.paid_amount || 0)), 0),
      };
    },
    staleTime: 30000,
  });

  const invoiceStats = stats || { total: 0, unpaid: 0, partial: 0, paid: 0, totalValue: 0, unpaidValue: 0 };

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

  const { sortedData, sortConfig, requestSort } = useTableSort(invoices);

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
    canEdit, canDelete, invoices, isLoading, error: error as Error | null, refetch, sortedData, sortConfig, requestSort,
    columnFilters, deleteMutation, handleEdit, handleAdd, handleRefresh,
    customerOptions, customerOptionsLoading, invoiceNumberOptions, invoiceNumberOptionsLoading,
    statItems, invoiceStats, pagination, totalCount, duplicate, isDuplicating,
    selectedIds, toggleSelect, clearSelection, bulkPrint, isBulkPrinting,
    selectAllFiltered, isSelectingAll,
    PAGE_SIZE,
  };
}
