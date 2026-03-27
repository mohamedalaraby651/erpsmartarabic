import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Search, Users, Building2, Crown, Phone, Mail, DollarSign, AlertTriangle, Upload, Filter, X, Merge, MapPin, FileText, MessageSquare, LayoutGrid, LayoutList, Trash2, Star, Download } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useAuth } from "@/hooks/useAuth";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { useDebounce } from "@/hooks/useDebounce";
import { useServerPagination } from "@/hooks/useServerPagination";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";
import { useCustomerAlerts } from "@/hooks/useCustomerAlerts";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { VirtualizedList } from "@/components/table/VirtualizedList";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import CustomerImportDialog from "@/components/customers/CustomerImportDialog";
import { FilterDrawer, FilterSection } from "@/components/filters/FilterDrawer";
import { FilterChips } from "@/components/filters/FilterChips";
import { egyptGovernorates } from "@/lib/egyptLocations";
import CustomerMergeDialog from "@/components/customers/CustomerMergeDialog";
import CustomerAvatar from "@/components/customers/CustomerAvatar";
import { CustomerSearchPreview } from "@/components/customers/CustomerSearchPreview";
import { SwipeableRow } from "@/components/mobile/SwipeableRow";
import CustomerGridCard from "@/components/customers/CustomerGridCard";

type Customer = Database['public']['Tables']['customers']['Row'];

const vipColors = {
  regular: "bg-muted text-muted-foreground",
  silver: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200",
  gold: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
  platinum: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};

const vipLabels = {
  regular: "عادي",
  silver: "فضي",
  gold: "ذهبي",
  platinum: "بلاتيني",
};

const typeLabels = {
  individual: "فرد",
  company: "شركة",
  farm: "مزرعة",
};

const typeIcons = {
  individual: Users,
  company: Building2,
  farm: Users,
};

const CustomersPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const { isMobile } = useResponsiveView();
  const { errorAlerts, warningAlerts, totalAlerts } = useCustomerAlerts();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [vipFilter, setVipFilter] = useState<string>("all");
  const [governorateFilter, setGovernorateFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);

  // New state: view mode and bulk selection
  const [viewMode, setViewMode] = useState<'table' | 'grid'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('customers-view-mode') as 'table' | 'grid') || 'table';
    }
    return 'table';
  });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  // Temporary filter state for drawer
  const [tempType, setTempType] = useState("all");
  const [tempVip, setTempVip] = useState("all");
  const [tempGovernorate, setTempGovernorate] = useState("all");
  const [tempStatus, setTempStatus] = useState("all");

  const debouncedSearch = useDebounce(searchQuery, 300);
  const canEdit = userRole === 'admin' || userRole === 'sales';
  const canDelete = userRole === 'admin';

  // Prefetch timer ref
  const prefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save view mode preference
  useEffect(() => {
    localStorage.setItem('customers-view-mode', viewMode);
  }, [viewMode]);

  // Handle action parameter from URL
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Server-side count query
  const { data: totalCount = 0 } = useQuery({
    queryKey: ['customers-count', debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter],
    queryFn: async () => {
      let query = supabase.from('customers').select('*', { count: 'exact', head: true });
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,governorate.ilike.%${debouncedSearch}%`);
      }
      if (typeFilter !== 'all') query = query.eq('customer_type', typeFilter as 'individual' | 'company' | 'farm');
      if (vipFilter !== 'all') query = query.eq('vip_level', vipFilter as 'regular' | 'silver' | 'gold' | 'platinum');
      if (governorateFilter !== 'all') query = query.eq('governorate', governorateFilter);
      if (statusFilter !== 'all') query = query.eq('is_active', statusFilter === 'active');
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    staleTime: 30000,
  });

  const pagination = useServerPagination({ pageSize: 25, totalCount });

  // Reset page on filter change
  useEffect(() => {
    pagination.resetPage();
  }, [debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter]);

  // Server-side paginated data query
  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['customers', debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter, pagination.currentPage],
    queryFn: async () => {
      let query = supabase.from('customers').select('*').order('created_at', { ascending: false }).range(pagination.range.from, pagination.range.to);
      if (debouncedSearch) {
        query = query.or(`name.ilike.%${debouncedSearch}%,phone.ilike.%${debouncedSearch}%,email.ilike.%${debouncedSearch}%,governorate.ilike.%${debouncedSearch}%`);
      }
      if (typeFilter !== 'all') query = query.eq('customer_type', typeFilter as 'individual' | 'company' | 'farm');
      if (vipFilter !== 'all') query = query.eq('vip_level', vipFilter as 'regular' | 'silver' | 'gold' | 'platinum');
      if (governorateFilter !== 'all') query = query.eq('governorate', governorateFilter);
      if (statusFilter !== 'all') query = query.eq('is_active', statusFilter === 'active');
      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });

  // Stats query using server-side RPC
  const { data: stats } = useQuery({
    queryKey: ['customers-stats'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_customer_stats');
      if (error) throw error;
      const d = data as Record<string, number>;
      return {
        total: d.total || 0,
        individuals: d.individuals || 0,
        companies: d.companies || 0,
        vip: d.vip || 0,
        totalBalance: d.total_balance || 0,
      };
    },
    staleTime: 30000,
  });

  const displayStats = stats || { total: 0, individuals: 0, companies: 0, vip: 0, totalBalance: 0 };

  const deleteMutation = useMutation({
    mutationFn: async (deleteId: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', deleteId);
      if (error) throw error;
    },
    onMutate: async (deleteId: string) => {
      await queryClient.cancelQueries({ queryKey: ['customers'] });
      const previousCustomers = queryClient.getQueryData(['customers', debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter, pagination.currentPage]);
      queryClient.setQueryData(
        ['customers', debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter, pagination.currentPage],
        (old: Customer[] | undefined) => old?.filter(c => c.id !== deleteId) || []
      );
      return { previousCustomers };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers-count'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      toast.success('تم حذف العميل بنجاح');
      setDeletingId(null);
    },
    onError: (_err, _deleteId, context) => {
      if (context?.previousCustomers) {
        queryClient.setQueryData(
          ['customers', debouncedSearch, typeFilter, vipFilter, governorateFilter, statusFilter, pagination.currentPage],
          context.previousCustomers
        );
      }
      toast.error('فشل حذف العميل');
      setDeletingId(null);
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('customers').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['customers-count'] });
      queryClient.invalidateQueries({ queryKey: ['customers-stats'] });
      toast.success(`تم حذف ${selectedIds.size} عميل بنجاح`);
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    },
    onError: () => {
      toast.error('فشل حذف العملاء المحددين');
      setBulkDeleteOpen(false);
    },
  });

  // Sorting (client-side on current page)
  const { sortedData, sortConfig, requestSort } = useTableSort(customers);

  const handleEdit = useCallback((customer: Customer) => {
    setSelectedCustomer(customer);
    setDialogOpen(true);
  }, []);

  const handleAdd = useCallback(() => {
    setSelectedCustomer(null);
    setDialogOpen(true);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeletingId(id);
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  // Quick actions
  const handleNewInvoice = useCallback((customerId: string) => {
    navigate('/invoices', { state: { prefillCustomerId: customerId } });
  }, [navigate]);

  const handleWhatsApp = useCallback((phone: string) => {
    const cleaned = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleaned}`, '_blank');
  }, []);

  // Prefetch on hover
  const handleRowHover = useCallback((customerId: string) => {
    if (prefetchTimerRef.current) clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = setTimeout(() => {
      queryClient.prefetchQuery({
        queryKey: ['customer', customerId],
        queryFn: async () => {
          const { data } = await supabase.from('customers').select('*').eq('id', customerId).single();
          return data;
        },
        staleTime: 60000,
      });
      queryClient.prefetchQuery({
        queryKey: ['customer-addresses', customerId],
        queryFn: async () => {
          const { data } = await supabase.from('customer_addresses').select('*').eq('customer_id', customerId).order('is_default', { ascending: false });
          return data;
        },
        staleTime: 60000,
      });
    }, 200);
  }, [queryClient]);

  const handleRowLeave = useCallback(() => {
    if (prefetchTimerRef.current) {
      clearTimeout(prefetchTimerRef.current);
      prefetchTimerRef.current = null;
    }
  }, []);

  // Bulk selection
  const toggleSelect = useCallback((id: string, checked: boolean) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback((checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(sortedData.map(c => c.id)));
    } else {
      setSelectedIds(new Set());
    }
  }, [sortedData]);

  const isAllSelected = sortedData.length > 0 && selectedIds.size === sortedData.length;
  const hasSelection = selectedIds.size > 0;

  const activeFiltersCount = [typeFilter, vipFilter, governorateFilter, statusFilter].filter(f => f !== 'all').length;

  const handleRefresh = async () => { await refetch(); };

  const getBalanceColor = (balance: number, creditLimit: number) => {
    if (balance <= 0) return 'text-emerald-600 dark:text-emerald-400';
    if (creditLimit > 0 && balance >= creditLimit * 0.5) return 'text-destructive';
    if (balance > 0) return 'text-amber-600 dark:text-amber-400';
    return 'text-emerald-600 dark:text-emerald-400';
  };

  const renderCustomerCard = useCallback((customer: Customer) => {
    return (
      <SwipeableRow
        key={customer.id}
        onEdit={canEdit ? () => handleEdit(customer) : undefined}
        onDelete={canDelete ? () => handleDelete(customer.id) : undefined}
      >
        <DataCard
          title={customer.name}
          subtitle={typeLabels[customer.customer_type as keyof typeof typeLabels]}
          icon={
            <CustomerAvatar
              name={customer.name}
              imageUrl={customer.image_url}
              customerType={customer.customer_type}
              size="sm"
            />
          }
          badge={{ text: vipLabels[customer.vip_level as keyof typeof vipLabels], variant: customer.vip_level === 'regular' ? 'secondary' : 'default' }}
          fields={[
            ...(customer.phone ? [{ label: 'الهاتف', value: customer.phone, icon: <Phone className="h-3 w-3" /> }] : []),
            ...(customer.governorate ? [{ label: 'المحافظة', value: customer.governorate, icon: <MapPin className="h-3 w-3" /> }] : []),
            { label: 'الرصيد', value: <span className={Number(customer.current_balance) > 0 ? 'text-destructive' : 'text-emerald-600 dark:text-emerald-400'}>{Number(customer.current_balance || 0).toLocaleString()} ج.م</span>, icon: <DollarSign className="h-3 w-3" /> },
          ]}
          onClick={() => navigate(`/customers/${customer.id}`)}
          onView={() => navigate(`/customers/${customer.id}`)}
          onEdit={canEdit ? () => handleEdit(customer) : undefined}
          onDelete={canDelete ? () => handleDelete(customer.id) : undefined}
        />
      </SwipeableRow>
    );
  }, [navigate, canEdit, canDelete, handleEdit, handleDelete]);

  const renderMobileView = () => {
    if (isLoading) return <MobileListSkeleton count={5} />;
    if (sortedData.length === 0) {
      return <EmptyState icon={Users} title="لا يوجد عملاء" description="ابدأ بإضافة عميلك الأول" action={canEdit ? { label: 'إضافة عميل', onClick: handleAdd, icon: Plus } : undefined} />;
    }
    if (sortedData.length > 50) {
      return (
        <PullToRefresh onRefresh={handleRefresh}>
          <VirtualizedList data={sortedData} renderItem={renderCustomerCard} getItemKey={(c) => c.id} itemHeight={140} maxHeight={window.innerHeight - 280} gap={12} className="px-1" />
        </PullToRefresh>
      );
    }
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-3">{sortedData.map(renderCustomerCard)}</div>
      </PullToRefresh>
    );
  };

  const renderGridView = () => {
    if (isLoading) return <TableSkeleton rows={4} columns={4} />;
    if (sortedData.length === 0) {
      return <EmptyState icon={Users} title="لا يوجد عملاء" description="ابدأ بإضافة عميلك الأول" action={canEdit ? { label: 'إضافة عميل جديد', onClick: handleAdd, icon: Plus } : undefined} />;
    }
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sortedData.map((customer) => (
          <CustomerGridCard
            key={customer.id}
            customer={customer}
            onClick={() => navigate(`/customers/${customer.id}`)}
            onNewInvoice={canEdit ? () => handleNewInvoice(customer.id) : undefined}
            onWhatsApp={customer.phone ? () => handleWhatsApp(customer.phone!) : undefined}
            isSelected={selectedIds.has(customer.id)}
            onSelect={(checked) => toggleSelect(customer.id, checked)}
            showSelect={hasSelection}
          />
        ))}
      </div>
    );
  };

  const renderTableView = () => {
    if (isLoading) return <TableSkeleton rows={5} columns={7} />;
    if (sortedData.length === 0) {
      return <EmptyState icon={Users} title="لا يوجد عملاء" description="ابدأ بإضافة عميلك الأول" action={canEdit ? { label: 'إضافة عميل جديد', onClick: handleAdd, icon: Plus } : undefined} />;
    }
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {canDelete && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={(c) => toggleSelectAll(!!c)}
                  />
                </TableHead>
              )}
              <TableHead><DataTableHeader label="الاسم" sortKey="name" sortConfig={sortConfig} onSort={requestSort} /></TableHead>
              <TableHead>النوع</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>المحافظة</TableHead>
              <TableHead>مستوى VIP</TableHead>
              <TableHead><DataTableHeader label="الرصيد" sortKey="current_balance" sortConfig={sortConfig} onSort={requestSort} /></TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((customer) => (
              <TableRow
                key={customer.id}
                className="hover:bg-muted/50 cursor-pointer"
                onClick={() => navigate(`/customers/${customer.id}`)}
                onMouseEnter={() => handleRowHover(customer.id)}
                onMouseLeave={handleRowLeave}
              >
                {canDelete && (
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(customer.id)}
                      onCheckedChange={(c) => toggleSelect(customer.id, !!c)}
                    />
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-3">
                    <CustomerAvatar
                      name={customer.name}
                      imageUrl={customer.image_url}
                      customerType={customer.customer_type}
                      size="sm"
                    />
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      {customer.email && <p className="text-sm text-muted-foreground">{customer.email}</p>}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {customer.customer_type === 'company' ? <><Building2 className="h-3 w-3 ml-1" /> شركة</> : customer.customer_type === 'farm' ? <>مزرعة</> : <><Users className="h-3 w-3 ml-1" /> فرد</>}
                  </Badge>
                </TableCell>
                <TableCell>{customer.phone || '-'}</TableCell>
                <TableCell><span className="text-sm text-muted-foreground">{customer.governorate || '-'}</span></TableCell>
                <TableCell>
                  <Badge className={vipColors[customer.vip_level as keyof typeof vipColors]}>
                    <Crown className="h-3 w-3 ml-1" />
                    {vipLabels[customer.vip_level as keyof typeof vipLabels]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <span className={getBalanceColor(Number(customer.current_balance), Number(customer.credit_limit))}>
                    {Number(customer.current_balance).toLocaleString()} ج.م
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={customer.is_active ? "default" : "secondary"}>{customer.is_active ? "نشط" : "غير نشط"}</Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-0.5">
                    <DataTableActions
                      onView={() => navigate(`/customers/${customer.id}`)}
                      onEdit={() => handleEdit(customer)}
                      onDelete={() => handleDelete(customer.id)}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      isDeleting={deletingId === customer.id}
                      deleteDescription="سيتم حذف العميل وجميع بياناته. هذا الإجراء لا يمكن التراجع عنه."
                    />
                    {canEdit && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleNewInvoice(customer.id)} title="فاتورة جديدة">
                        <FileText className="h-4 w-4 text-primary" />
                      </Button>
                    )}
                    {customer.phone && (
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleWhatsApp(customer.phone!)} title="واتساب">
                        <MessageSquare className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex-1">
          <h1 className="text-xl md:text-2xl font-bold">إدارة العملاء</h1>
          <p className="text-sm text-muted-foreground">إدارة بيانات العملاء والتصنيفات</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {!isMobile && (
            <>
              <Button variant="outline" size="sm" onClick={() => setMergeDialogOpen(true)}>
                <Merge className="h-4 w-4 ml-2" />
                دمج
              </Button>
              <Button variant="outline" size="sm" onClick={() => setImportDialogOpen(true)}>
                <Upload className="h-4 w-4 ml-2" />
                استيراد
              </Button>
              <ExportWithTemplateButton
                section="customers"
                sectionLabel="العملاء"
                data={customers}
                columns={[
                  { key: 'name', label: 'الاسم' },
                  { key: 'phone', label: 'الهاتف' },
                  { key: 'email', label: 'البريد الإلكتروني' },
                  { key: 'customer_type', label: 'النوع' },
                  { key: 'vip_level', label: 'مستوى VIP' },
                  { key: 'current_balance', label: 'الرصيد' },
                  { key: 'credit_limit', label: 'حد الائتمان' },
                ]}
              />
            </>
          )}
          {canEdit && (
            <Button onClick={handleAdd} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 ml-2" />
              إضافة عميل
            </Button>
          )}
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {hasSelection && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-3 flex items-center justify-between">
            <span className="text-sm font-medium">تم تحديد {selectedIds.size} عميل</span>
            <div className="flex items-center gap-2">
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={() => setBulkDeleteOpen(true)}>
                  <Trash2 className="h-4 w-4 ml-1" />
                  حذف المحدد
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
                <X className="h-4 w-4 ml-1" />
                إلغاء التحديد
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      {isMobile ? (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {[
              { icon: Users, value: displayStats.total, label: 'الإجمالي', color: 'text-primary' },
              { icon: Users, value: displayStats.individuals, label: 'أفراد', color: 'text-info' },
              { icon: Building2, value: displayStats.companies, label: 'شركات', color: 'text-secondary-foreground' },
              { icon: Crown, value: displayStats.vip, label: 'VIP', color: 'text-warning' },
              { icon: DollarSign, value: `${displayStats.totalBalance.toLocaleString()}`, label: 'الأرصدة', color: displayStats.totalBalance > 0 ? 'text-destructive' : 'text-emerald-600' },
            ].map((stat, i) => (
              <Card key={i} className="min-w-[110px] shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    <div>
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { icon: Users, value: displayStats.total, label: 'إجمالي العملاء', color: 'text-primary', bg: 'bg-primary/10' },
            { icon: Users, value: displayStats.individuals, label: 'أفراد', color: 'text-info', bg: 'bg-info/10' },
            { icon: Building2, value: displayStats.companies, label: 'شركات', color: 'text-secondary-foreground', bg: 'bg-secondary' },
            { icon: Crown, value: displayStats.vip, label: 'عملاء VIP', color: 'text-warning', bg: 'bg-warning/10' },
            { icon: DollarSign, value: displayStats.totalBalance.toLocaleString(), label: 'الأرصدة المستحقة', color: displayStats.totalBalance > 0 ? 'text-destructive' : 'text-emerald-600', bg: displayStats.totalBalance > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10' },
          ].map((stat, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${stat.bg}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                  <div>
                    <p className={`text-2xl font-bold ${i === 4 ? stat.color : ''}`}>{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Alerts */}
      {totalAlerts > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-warning" />
              <span className="font-medium text-sm">تنبيهات ({totalAlerts})</span>
            </div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {errorAlerts.slice(0, 3).map((alert, i) => (
                <p key={`e-${i}`} className="text-xs text-destructive">⚠️ {alert.message}</p>
              ))}
              {warningAlerts.slice(0, 3).map((alert, i) => (
                <p key={`w-${i}`} className="text-xs text-amber-600 dark:text-amber-400">⏰ {alert.message}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <CustomerSearchPreview
              value={searchQuery}
              onChange={setSearchQuery}
            />
            {isMobile ? (
              <Button variant="outline" size="sm" onClick={() => {
                setTempType(typeFilter);
                setTempVip(vipFilter);
                setTempGovernorate(governorateFilter);
                setTempStatus(statusFilter);
                setFilterDrawerOpen(true);
              }} className="relative">
                <Filter className="h-4 w-4 ml-2" />
                الفلاتر
                {activeFiltersCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-2 -left-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            ) : (
              <>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="نوع العميل" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="individual">فرد</SelectItem>
                    <SelectItem value="company">شركة</SelectItem>
                    <SelectItem value="farm">مزرعة</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={vipFilter} onValueChange={setVipFilter}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="مستوى VIP" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="regular">عادي</SelectItem>
                    <SelectItem value="silver">فضي</SelectItem>
                    <SelectItem value="gold">ذهبي</SelectItem>
                    <SelectItem value="platinum">بلاتيني</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={governorateFilter} onValueChange={setGovernorateFilter}>
                  <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="المحافظة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل المحافظات</SelectItem>
                    {egyptGovernorates.map((gov) => (
                      <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32"><SelectValue placeholder="الحالة" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="active">نشط</SelectItem>
                    <SelectItem value="inactive">غير نشط</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
          {/* Active Filter Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              <FilterChips
                chips={[
                  ...(typeFilter !== 'all' ? [{ id: 'type', label: `النوع: ${typeLabels[typeFilter as keyof typeof typeLabels] || typeFilter}`, value: typeFilter }] : []),
                  ...(vipFilter !== 'all' ? [{ id: 'vip', label: `VIP: ${vipLabels[vipFilter as keyof typeof vipLabels] || vipFilter}`, value: vipFilter }] : []),
                  ...(governorateFilter !== 'all' ? [{ id: 'governorate', label: `المحافظة: ${governorateFilter}`, value: governorateFilter }] : []),
                  ...(statusFilter !== 'all' ? [{ id: 'status', label: statusFilter === 'active' ? 'نشط' : 'غير نشط', value: statusFilter }] : []),
                ]}
                activeChips={[
                  ...(typeFilter !== 'all' ? ['type'] : []),
                  ...(vipFilter !== 'all' ? ['vip'] : []),
                  ...(governorateFilter !== 'all' ? ['governorate'] : []),
                  ...(statusFilter !== 'all' ? ['status'] : []),
                ]}
                onToggle={(chipId) => {
                  if (chipId === 'type') setTypeFilter('all');
                  if (chipId === 'vip') setVipFilter('all');
                  if (chipId === 'governorate') setGovernorateFilter('all');
                  if (chipId === 'status') setStatusFilter('all');
                }}
                onClearAll={() => { setTypeFilter('all'); setVipFilter('all'); setGovernorateFilter('all'); setStatusFilter('all'); }}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content */}
      {isMobile ? (
        <div className="pb-20">
          {renderMobileView()}
          {totalCount > 25 && (
            <div className="mt-4">
              <ServerPagination
                currentPage={pagination.currentPage}
                totalPages={pagination.totalPages}
                totalCount={totalCount}
                pageSize={pagination.pageSize}
                onPageChange={pagination.goToPage}
                hasNextPage={pagination.hasNextPage}
                hasPrevPage={pagination.hasPrevPage}
              />
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>قائمة العملاء ({totalCount})</CardTitle>
              <div className="flex items-center gap-1 border rounded-lg p-0.5">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('table')}
                  title="عرض جدول"
                >
                  <LayoutList className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setViewMode('grid')}
                  title="عرض بطاقات"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? renderGridView() : renderTableView()}
            {totalCount > 25 && (
              <div className="mt-4">
                <ServerPagination
                  currentPage={pagination.currentPage}
                  totalPages={pagination.totalPages}
                  totalCount={totalCount}
                  pageSize={pagination.pageSize}
                  onPageChange={pagination.goToPage}
                  hasNextPage={pagination.hasNextPage}
                  hasPrevPage={pagination.hasPrevPage}
                />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Mobile Filter Drawer */}
      <FilterDrawer
        open={filterDrawerOpen}
        onOpenChange={setFilterDrawerOpen}
        title="فلاتر العملاء"
        activeFiltersCount={activeFiltersCount}
        onApply={() => {
          setTypeFilter(tempType);
          setVipFilter(tempVip);
          setGovernorateFilter(tempGovernorate);
          setStatusFilter(tempStatus);
        }}
        onReset={() => {
          setTempType('all');
          setTempVip('all');
          setTempGovernorate('all');
          setTempStatus('all');
        }}
      >
        <FilterSection title="نوع العميل">
          <Select value={tempType} onValueChange={setTempType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="individual">فرد</SelectItem>
              <SelectItem value="company">شركة</SelectItem>
              <SelectItem value="farm">مزرعة</SelectItem>
            </SelectContent>
          </Select>
        </FilterSection>
        <FilterSection title="مستوى VIP">
          <Select value={tempVip} onValueChange={setTempVip}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="regular">عادي</SelectItem>
              <SelectItem value="silver">فضي</SelectItem>
              <SelectItem value="gold">ذهبي</SelectItem>
              <SelectItem value="platinum">بلاتيني</SelectItem>
            </SelectContent>
          </Select>
        </FilterSection>
        <FilterSection title="المحافظة">
          <Select value={tempGovernorate} onValueChange={setTempGovernorate}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل المحافظات</SelectItem>
              {egyptGovernorates.map((gov) => (
                <SelectItem key={gov} value={gov}>{gov}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterSection>
        <FilterSection title="الحالة">
          <Select value={tempStatus} onValueChange={setTempStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="active">نشط</SelectItem>
              <SelectItem value="inactive">غير نشط</SelectItem>
            </SelectContent>
          </Select>
        </FilterSection>
      </FilterDrawer>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>حذف {selectedIds.size} عميل</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف العملاء المحددين وجميع بياناتهم. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkDeleteMutation.mutate(Array.from(selectedIds))}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={bulkDeleteMutation.isPending}
            >
              {bulkDeleteMutation.isPending ? 'جاري الحذف...' : 'حذف الكل'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialogs */}
      <CustomerFormDialog open={dialogOpen} onOpenChange={setDialogOpen} customer={selectedCustomer} />
      <CustomerImportDialog open={importDialogOpen} onOpenChange={setImportDialogOpen} />
      <CustomerMergeDialog open={mergeDialogOpen} onOpenChange={setMergeDialogOpen} />
    </div>
  );
};

export default CustomersPage;
