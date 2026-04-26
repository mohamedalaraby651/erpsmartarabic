import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useDebounce } from "@/hooks/useDebounce";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, FileText, Printer, Eye, Calendar, CheckCircle } from "lucide-react";
import { EntityLink } from "@/components/shared/EntityLink";
import QuotationFormDialog from "@/components/quotations/QuotationFormDialog";
import { QuotationPrintView } from "@/components/print/QuotationPrintView";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";
import { MobileListSkeleton, MobileStatSkeleton } from "@/components/mobile/MobileListSkeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import type { Database } from "@/integrations/supabase/types";

type Quotation = Database['public']['Tables']['quotations']['Row'];

const PAGE_SIZE = 25;

const statusLabels: Record<string, string> = {
  draft: "مسودة",
  pending: "معلق",
  approved: "معتمد",
  rejected: "مرفوض",
  cancelled: "ملغي",
};

const statusColors: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  pending: "bg-warning/10 text-warning",
  approved: "bg-success/10 text-success",
  rejected: "bg-destructive/10 text-destructive",
  cancelled: "bg-muted text-muted-foreground",
};

const QuotationsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printQuotationId, setPrintQuotationId] = useState<string | null>(null);
  const { userRole } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const canEdit = userRole === 'admin' || userRole === 'sales';
  const canDelete = userRole === 'admin';

  // Handle action parameter from URL (FAB/QuickActions)
  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: totalCount = 0 } = useQuery({
    queryKey: ['quotations-count', debouncedSearch],
    queryFn: async () => {
      let query = supabase.from('quotations').select('*', { count: 'exact', head: true });
      if (debouncedSearch) query = query.or(`quotation_number.ilike.%${debouncedSearch}%`);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });

  const { data: quotations = [], isLoading, refetch } = useQuery({
    queryKey: ['quotations', debouncedSearch, pagination.currentPage],
    queryFn: async () => {
      let query = supabase
        .from('quotations')
        .select('*, customers(name)')
        .order('created_at', { ascending: false })
        .range(pagination.range.from, pagination.range.to);
      if (debouncedSearch) query = query.or(`quotation_number.ilike.%${debouncedSearch}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const hasPermission = await verifyPermissionOnServer('quotations', 'delete');
      if (!hasPermission) throw new Error('UNAUTHORIZED');
      await supabase.from('quotation_items').delete().eq('quotation_id', id);
      const { error } = await supabase.from('quotations').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast({ title: "تم حذف عرض السعر بنجاح" });
    },
    onError: (error) => {
      if (error.message === 'UNAUTHORIZED') {
        toast({ title: "غير مصرح", description: "ليس لديك صلاحية حذف عروض الأسعار", variant: "destructive" });
      } else {
        toast({ title: "خطأ في حذف عرض السعر", variant: "destructive" });
      }
    },
  });

  type QuotationWithCustomer = Quotation & { customers: { name: string } | null };

  // Search is now server-side
  const searchFiltered = quotations as QuotationWithCustomer[];

  const { filteredData, filters, setFilter } = useTableFilter(searchFiltered);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const stats = {
    total: quotations.length,
    pending: (quotations as QuotationWithCustomer[]).filter((q) => q.status === 'pending').length,
    approved: (quotations as QuotationWithCustomer[]).filter((q) => q.status === 'approved').length,
    totalValue: (quotations as QuotationWithCustomer[]).reduce((sum: number, q) => sum + Number(q.total_amount), 0),
  };

  const handleEdit = (quotation: Quotation) => {
    setSelectedQuotation(quotation);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedQuotation(null);
    setDialogOpen(true);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const statItems = [
    { label: 'إجمالي العروض', value: stats.total, icon: FileText, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'قيد الانتظار', value: stats.pending, icon: FileText, color: 'text-warning', bgColor: 'bg-warning/10' },
    { label: 'معتمدة', value: stats.approved, icon: CheckCircle, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'إجمالي القيمة', value: `${stats.totalValue.toLocaleString()}`, icon: FileText, color: 'text-info', bgColor: 'bg-info/10' },
  ];

  // Mobile View
  const renderMobileView = () => {
    if (isLoading) {
      return (
        <div className="space-y-5">
          <div className="h-11 rounded-md bg-muted animate-pulse" />
          <MobileStatSkeleton count={4} />
          <MobileListSkeleton count={5} variant="order" />
        </div>
      );
    }

    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-5">
          {/* 1. Search — primary */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="بحث برقم العرض أو اسم العميل..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-11"
              inputMode="search"
            />
          </div>

          {/* 2. Stats chips — secondary, compact */}
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {statItems.map((stat, i) => (
              <Card key={i} className="min-w-[130px] shrink-0 border-border/60 shadow-xs">
                <CardContent className="p-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${stat.bgColor}`}>
                      <stat.icon className={`h-3.5 w-3.5 ${stat.color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-bold tabular-nums leading-tight">{stat.value}</p>
                      <p className="text-[11px] text-muted-foreground leading-tight truncate">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quotations List */}
          {sortedData.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="لا توجد عروض أسعار"
              description="ابدأ بإضافة عرض سعر جديد"
              action={{
                label: "عرض سعر جديد",
                onClick: handleAdd,
                icon: Plus,
              }}
            />
          ) : (
            <div className="space-y-3">
              {(sortedData as QuotationWithCustomer[]).map((quotation) => (
                <DataCard
                  key={quotation.id}
                  title={quotation.quotation_number}
                  subtitle={quotation.customers?.name || 'بدون عميل'}
                  badge={{
                    text: statusLabels[quotation.status],
                    variant: quotation.status === 'approved' ? 'default' : quotation.status === 'pending' ? 'secondary' : 'outline',
                  }}
                  icon={<FileText className="h-5 w-5" />}
                  fields={[
                    { label: 'الإجمالي', value: `${Number(quotation.total_amount).toLocaleString()} ج.م` },
                    { label: 'صالح حتى', value: quotation.valid_until ? new Date(quotation.valid_until).toLocaleDateString('ar-EG') : '-', icon: <Calendar className="h-4 w-4" /> },
                  ]}
                  onClick={() => navigate(`/quotations/${quotation.id}`)}
                  onView={() => navigate(`/quotations/${quotation.id}`)}
                  onEdit={canEdit ? () => handleEdit(quotation) : undefined}
                  onDelete={canDelete ? () => deleteMutation.mutate(quotation.id) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      </PullToRefresh>
    );
  };

  // Desktop View
  const renderTableView = () => {
    if (isLoading) {
      return <TableSkeleton rows={5} columns={7} />;
    }

    if (sortedData.length === 0) {
      return (
        <EmptyState
          icon={FileText}
          title="لا توجد عروض أسعار"
          description="ابدأ بإضافة عرض سعر جديد"
          action={{
            label: "عرض سعر جديد",
            onClick: handleAdd,
            icon: Plus,
          }}
        />
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <DataTableHeader
                label="رقم العرض"
                sortKey="quotation_number"
                sortConfig={sortConfig}
                onSort={requestSort}
              />
              <DataTableHeader label="العميل" />
              <DataTableHeader
                label="التاريخ"
                sortKey="created_at"
                sortConfig={sortConfig}
                onSort={requestSort}
              />
              <DataTableHeader label="صالح حتى" />
              <DataTableHeader
                label="الإجمالي"
                sortKey="total_amount"
                sortConfig={sortConfig}
                onSort={requestSort}
              />
              <DataTableHeader
                label="الحالة"
                filterKey="status"
                filterType="select"
                filterOptions={[
                  { value: 'draft', label: 'مسودة' },
                  { value: 'pending', label: 'معلق' },
                  { value: 'approved', label: 'معتمد' },
                  { value: 'rejected', label: 'مرفوض' },
                ]}
                filterValue={filters.status as string}
                onFilter={setFilter}
              />
              <DataTableHeader label="إجراءات" className="text-left" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(sortedData as QuotationWithCustomer[]).map((quotation) => (
              <TableRow key={quotation.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/quotations/${quotation.id}`)}>
                <TableCell>
                  <EntityLink type="quotation" id={quotation.id}>
                    {quotation.quotation_number}
                  </EntityLink>
                </TableCell>
                <TableCell>
                  {quotation.customers?.name ? (
                    <EntityLink type="customer" id={quotation.customer_id}>
                      {quotation.customers.name}
                    </EntityLink>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {new Date(quotation.created_at).toLocaleDateString('ar-EG')}
                </TableCell>
                <TableCell>
                  {quotation.valid_until 
                    ? new Date(quotation.valid_until).toLocaleDateString('ar-EG')
                    : '-'}
                </TableCell>
                <TableCell>
                  <span className="font-bold">
                    {Number(quotation.total_amount).toLocaleString()} ج.م
                  </span>
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[quotation.status]}>
                    {statusLabels[quotation.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/quotations/${quotation.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setPrintQuotationId(quotation.id); setPrintDialogOpen(true); }}>
                      <Printer className="h-4 w-4" />
                    </Button>
                    <DataTableActions
                      onEdit={() => handleEdit(quotation)}
                      onDelete={() => deleteMutation.mutate(quotation.id)}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      deleteDescription="سيتم حذف عرض السعر وجميع بنوده نهائياً."
                    />
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
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">عروض الأسعار</h1>
          <p className="text-muted-foreground">إدارة عروض الأسعار للعملاء</p>
        </div>
        <div className="flex gap-2">
          {!isMobile && (
            <ExportWithTemplateButton
              section="quotations"
              sectionLabel="عروض الأسعار"
              data={sortedData}
              columns={[
                { key: 'quotation_number', label: 'رقم العرض' },
                { key: 'customers.name', label: 'العميل' },
                { key: 'total_amount', label: 'الإجمالي' },
                { key: 'status', label: 'الحالة' },
                { key: 'valid_until', label: 'صالح حتى' },
                { key: 'created_at', label: 'التاريخ' },
              ]}
            />
          )}
          <Button onClick={handleAdd} size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 ml-2" />
            {isMobile ? "جديد" : "عرض سعر جديد"}
          </Button>
        </div>
      </div>

      {/* Content */}
      {isMobile ? renderMobileView() : (
        <>
          {/* Desktop Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statItems.map((stat, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <Card>
            <CardContent className="p-4">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث برقم العرض أو اسم العميل..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة عروض الأسعار</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTableView()}
            </CardContent>
          </Card>
        </>
      )}

      <QuotationFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        quotation={selectedQuotation}
      />

      {printQuotationId && (
        <QuotationPrintView
          quotationId={printQuotationId}
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
        />
      )}

      <ServerPagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalCount={totalCount}
        pageSize={PAGE_SIZE}
        onPageChange={pagination.goToPage}
        hasNextPage={pagination.hasNextPage}
        hasPrevPage={pagination.hasPrevPage}
      />
    </div>
  );
};

export default QuotationsPage;
