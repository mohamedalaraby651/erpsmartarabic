import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Users, Building2, Crown, Phone, Mail, DollarSign } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import CustomerFormDialog from "@/components/customers/CustomerFormDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// Virtual scrolling components
import { VirtualizedTable, VirtualColumn } from "@/components/table/VirtualizedTable";
import { VirtualizedList } from "@/components/table/VirtualizedList";

// Mobile components
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TableSkeleton } from "@/components/ui/table-skeleton";

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
  const { isMobile, isTableView } = useResponsiveView();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const { data: customers = [], isLoading, refetch } = useQuery({
    queryKey: ['customers', searchQuery],
    queryFn: async () => {
      let query = supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,governorate.ilike.%${searchQuery}%,contact_person.ilike.%${searchQuery}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Customer[];
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('customers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('تم حذف العميل بنجاح');
      setDeletingId(null);
    },
    onError: () => {
      toast.error('فشل حذف العميل');
      setDeletingId(null);
    },
  });

  // Filtering
  const { filteredData, filters, setFilter } = useTableFilter(customers);

  // Sorting
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

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

  const handleRefresh = async () => {
    await refetch();
  };

  const stats = {
    total: customers.length,
    individuals: customers.filter(c => c.customer_type === 'individual').length,
    companies: customers.filter(c => c.customer_type === 'company').length,
    vip: customers.filter(c => c.vip_level !== 'regular').length,
    totalBalance: customers.reduce((sum, c) => sum + Number(c.current_balance || 0), 0),
  };

  const getBalanceColor = (balance: number, creditLimit: number) => {
    if (balance <= 0) return 'text-emerald-600';
    if (creditLimit > 0 && balance >= creditLimit * 0.5) return 'text-destructive';
    if (balance > 0) return 'text-amber-600';
    return 'text-emerald-600';
  };

  // Memoized mobile card renderer for virtual list
  const renderCustomerCard = useCallback((customer: Customer) => {
    const TypeIcon = typeIcons[customer.customer_type as keyof typeof typeIcons] || Users;
    return (
      <DataCard
        key={customer.id}
        title={customer.name}
        subtitle={typeLabels[customer.customer_type as keyof typeof typeLabels]}
        icon={<TypeIcon className="h-5 w-5" />}
        badge={{
          text: vipLabels[customer.vip_level as keyof typeof vipLabels],
          variant: customer.vip_level === 'regular' ? 'secondary' : 'default',
        }}
        fields={[
          ...(customer.phone ? [{ label: 'الهاتف', value: customer.phone, icon: <Phone className="h-3 w-3" /> }] : []),
          ...(customer.email ? [{ label: 'البريد', value: customer.email, icon: <Mail className="h-3 w-3" /> }] : []),
        ]}
        onClick={() => navigate(`/customers/${customer.id}`)}
        onView={() => navigate(`/customers/${customer.id}`)}
        onEdit={canEdit ? () => handleEdit(customer) : undefined}
        onDelete={canDelete ? () => handleDelete(customer.id) : undefined}
      />
    );
  }, [navigate, canEdit, canDelete, handleEdit, handleDelete]);

  // Render mobile list view with virtual scrolling
  const renderMobileView = () => {
    if (isLoading) {
      return <MobileListSkeleton count={5} />;
    }

    if (sortedData.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="لا يوجد عملاء"
          description="ابدأ بإضافة عميلك الأول"
          action={canEdit ? { label: 'إضافة عميل', onClick: handleAdd, icon: Plus } : undefined}
        />
      );
    }

    // Use virtual scrolling for large lists (50+ items)
    if (sortedData.length > 50) {
      return (
        <PullToRefresh onRefresh={handleRefresh}>
          <VirtualizedList
            data={sortedData}
            renderItem={(customer) => renderCustomerCard(customer)}
            getItemKey={(customer) => customer.id}
            itemHeight={140}
            maxHeight={window.innerHeight - 280}
            gap={12}
            className="px-1"
          />
        </PullToRefresh>
      );
    }

    // Use regular rendering for small lists
    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-3">
          {sortedData.map((customer) => renderCustomerCard(customer))}
        </div>
      </PullToRefresh>
    );
  };

  // Render desktop table view
  const renderTableView = () => {
    if (isLoading) {
      return <TableSkeleton rows={5} columns={7} />;
    }

    if (sortedData.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="لا يوجد عملاء"
          description="ابدأ بإضافة عميلك الأول"
          action={canEdit ? { label: 'إضافة عميل جديد', onClick: handleAdd, icon: Plus } : undefined}
        />
      );
    }

    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <DataTableHeader
                  label="الاسم"
                  sortKey="name"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </TableHead>
              <TableHead>
                <DataTableHeader
                  label="النوع"
                  filterKey="customer_type"
                  filterValue={filters.customer_type as string}
                  filterType="select"
                  filterOptions={[
                    { label: 'فرد', value: 'individual' },
                    { label: 'شركة', value: 'company' },
                    { label: 'مزرعة', value: 'farm' },
                  ]}
                  onFilter={setFilter}
                />
              </TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>المحافظة</TableHead>
              <TableHead>
                <DataTableHeader
                  label="مستوى VIP"
                  filterKey="vip_level"
                  filterValue={filters.vip_level as string}
                  filterType="select"
                  filterOptions={[
                    { label: 'عادي', value: 'regular' },
                    { label: 'فضي', value: 'silver' },
                    { label: 'ذهبي', value: 'gold' },
                    { label: 'بلاتيني', value: 'platinum' },
                  ]}
                  onFilter={setFilter}
                />
              </TableHead>
              <TableHead>
                <DataTableHeader
                  label="الرصيد"
                  sortKey="current_balance"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((customer) => (
              <TableRow key={customer.id} className="hover:bg-muted/50">
                <TableCell>
                  <div>
                    <p className="font-medium">{customer.name}</p>
                    {customer.email && (
                      <p className="text-sm text-muted-foreground">{customer.email}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {customer.customer_type === 'company' ? (
                      <><Building2 className="h-3 w-3 ml-1" /> شركة</>
                    ) : customer.customer_type === 'farm' ? (
                      <>مزرعة</>
                    ) : (
                      <><Users className="h-3 w-3 ml-1" /> فرد</>
                    )}
                  </Badge>
                </TableCell>
                <TableCell>{customer.phone || '-'}</TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">{(customer as any).governorate || '-'}</span>
                </TableCell>
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
                  <Badge variant={customer.is_active ? "default" : "secondary"}>
                    {customer.is_active ? "نشط" : "غير نشط"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DataTableActions
                    onView={() => navigate(`/customers/${customer.id}`)}
                    onEdit={() => handleEdit(customer)}
                    onDelete={() => handleDelete(customer.id)}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    isDeleting={deletingId === customer.id}
                    deleteDescription="سيتم حذف العميل وجميع بياناته. هذا الإجراء لا يمكن التراجع عنه."
                  />
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
          )}
          {canEdit && (
            <Button onClick={handleAdd} size={isMobile ? "default" : "default"} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 ml-2" />
              إضافة عميل
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards - Horizontal scroll on mobile */}
      {isMobile ? (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {[
              { icon: Users, value: stats.total, label: 'الإجمالي', color: 'text-primary' },
              { icon: Users, value: stats.individuals, label: 'أفراد', color: 'text-info' },
              { icon: Building2, value: stats.companies, label: 'شركات', color: 'text-secondary-foreground' },
              { icon: Crown, value: stats.vip, label: 'VIP', color: 'text-warning' },
              { icon: DollarSign, value: `${stats.totalBalance.toLocaleString()}`, label: 'الأرصدة المستحقة', color: stats.totalBalance > 0 ? 'text-destructive' : 'text-emerald-600' },
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
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">إجمالي العملاء</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Users className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.individuals}</p>
                  <p className="text-sm text-muted-foreground">أفراد</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-secondary">
                  <Building2 className="h-5 w-5 text-secondary-foreground" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.companies}</p>
                  <p className="text-sm text-muted-foreground">شركات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Crown className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.vip}</p>
                  <p className="text-sm text-muted-foreground">عملاء VIP</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stats.totalBalance > 0 ? 'bg-destructive/10' : 'bg-emerald-500/10'}`}>
                  <DollarSign className={`h-5 w-5 ${stats.totalBalance > 0 ? 'text-destructive' : 'text-emerald-600'}`} />
                </div>
                <div>
                  <p className={`text-2xl font-bold ${stats.totalBalance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>{stats.totalBalance.toLocaleString()}</p>
                  <p className="text-sm text-muted-foreground">الأرصدة المستحقة</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم، الهاتف، المحافظة..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            {!isMobile && (
              <>
                <Select 
                  value={(filters.customer_type as string) || 'all'} 
                  onValueChange={(v) => setFilter('customer_type', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="نوع العميل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="individual">فرد</SelectItem>
                    <SelectItem value="company">شركة</SelectItem>
                    <SelectItem value="farm">مزرعة</SelectItem>
                  </SelectContent>
                </Select>
                <Select 
                  value={(filters.vip_level as string) || 'all'} 
                  onValueChange={(v) => setFilter('vip_level', v === 'all' ? undefined : v)}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="مستوى VIP" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="regular">عادي</SelectItem>
                    <SelectItem value="silver">فضي</SelectItem>
                    <SelectItem value="gold">ذهبي</SelectItem>
                    <SelectItem value="platinum">بلاتيني</SelectItem>
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Content - Mobile or Desktop */}
      {isMobile ? (
        <div className="pb-20">
          {renderMobileView()}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>قائمة العملاء ({sortedData.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {renderTableView()}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Customer Dialog */}
      <CustomerFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        customer={selectedCustomer}
      />
    </div>
  );
};

export default CustomersPage;
