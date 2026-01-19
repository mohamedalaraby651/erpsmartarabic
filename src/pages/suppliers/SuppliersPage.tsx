import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Users, Phone, Mail, Building2, CreditCard } from "lucide-react";
import { toast } from "sonner";
import SupplierFormDialog from "@/components/suppliers/SupplierFormDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/use-mobile";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { EmptyState } from "@/components/shared/EmptyState";
import { MobileListSkeleton, MobileStatSkeleton } from "@/components/mobile/MobileListSkeleton";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SuppliersPage = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { userRole } = useAuth();
  const isMobile = useIsMobile();
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canEdit = userRole === 'admin' || userRole === 'warehouse';
  const canDelete = userRole === 'admin';

  // Fetch suppliers
  const { data: suppliers = [], isLoading, refetch } = useQuery({
    queryKey: ["suppliers", searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (searchTerm) {
        query = query.or(`name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch purchase orders for stats
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ["purchase_orders_stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("purchase_orders")
        .select("supplier_id, total_amount, status");
      if (error) throw error;
      return data;
    },
  });

  // Delete supplier mutation
  const deleteSupplierMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("suppliers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("تم حذف المورد بنجاح");
      setDeletingId(null);
    },
    onError: () => {
      toast.error("خطأ في حذف المورد");
      setDeletingId(null);
    },
  });

  // Filtering
  const { filteredData, filters, setFilter } = useTableFilter(suppliers);

  // Sorting
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  // Calculate stats
  const activeSuppliers = suppliers.filter((s: any) => s.is_active).length;
  const totalBalance = suppliers.reduce(
    (sum: number, s: any) => sum + (s.current_balance || 0),
    0
  );
  const totalPurchases = purchaseOrders.reduce(
    (sum: number, o: any) => sum + (o.total_amount || 0),
    0
  );

  // Get supplier purchase stats
  const getSupplierStats = (supplierId: string) => {
    const orders = purchaseOrders.filter((o: any) => o.supplier_id === supplierId);
    return {
      orderCount: orders.length,
      totalAmount: orders.reduce((sum: number, o: any) => sum + (o.total_amount || 0), 0),
    };
  };

  const handleEdit = (supplier: any) => {
    setSelectedSupplier(supplier);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedSupplier(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteSupplierMutation.mutate(id);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const statItems = [
    { label: 'إجمالي الموردين', value: suppliers.length, icon: Users, color: 'text-primary', bgColor: 'bg-primary/10' },
    { label: 'النشطين', value: activeSuppliers, icon: Users, color: 'text-success', bgColor: 'bg-success/10' },
    { label: 'إجمالي المشتريات', value: `${totalPurchases.toLocaleString()}`, icon: CreditCard, color: 'text-info', bgColor: 'bg-info/10' },
    { label: 'إجمالي الأرصدة', value: `${totalBalance.toLocaleString()}`, icon: CreditCard, color: 'text-warning', bgColor: 'bg-warning/10' },
  ];

  // Mobile View
  const renderMobileView = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          <MobileStatSkeleton count={4} />
          <MobileListSkeleton count={5} />
        </div>
      );
    }

    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-4">
          {/* Mobile Stats */}
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {statItems.map((stat, i) => (
              <Card key={i} className="min-w-[140px] shrink-0">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-4 w-4 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-lg font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Suppliers List */}
          {sortedData.length === 0 ? (
            <EmptyState
              icon={Users}
              title="لا يوجد موردين"
              description="ابدأ بإضافة مورد جديد"
              action={{
                label: "مورد جديد",
                onClick: handleAdd,
                icon: Plus,
              }}
            />
          ) : (
            <div className="space-y-3">
              {sortedData.map((supplier: any) => {
                const stats = getSupplierStats(supplier.id);
                return (
                  <DataCard
                    key={supplier.id}
                    title={supplier.name}
                    subtitle={supplier.contact_person || 'بدون جهة اتصال'}
                    badge={{
                      label: supplier.is_active ? 'نشط' : 'غير نشط',
                      variant: supplier.is_active ? 'default' : 'secondary',
                    }}
                    icon={Building2}
                    iconBgColor="bg-primary/10"
                    iconColor="text-primary"
                    fields={[
                      { label: 'الهاتف', value: supplier.phone || '-', icon: Phone },
                      { label: 'الطلبات', value: stats.orderCount.toString() },
                      { label: 'الرصيد', value: `${(supplier.current_balance || 0).toLocaleString()} ج.م` },
                    ]}
                    onClick={() => navigate(`/suppliers/${supplier.id}`)}
                    onView={() => navigate(`/suppliers/${supplier.id}`)}
                    onEdit={canEdit ? () => handleEdit(supplier) : undefined}
                    onDelete={canDelete ? () => handleDelete(supplier.id) : undefined}
                  />
                );
              })}
            </div>
          )}
        </div>
      </PullToRefresh>
    );
  };

  // Desktop View
  const renderTableView = () => {
    if (isLoading) {
      return <TableSkeleton rows={5} columns={9} />;
    }

    if (sortedData.length === 0) {
      return (
        <EmptyState
          icon={Users}
          title="لا يوجد موردين"
          description="ابدأ بإضافة مورد جديد"
          action={{
            label: "مورد جديد",
            onClick: handleAdd,
            icon: Plus,
          }}
        />
      );
    }

    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <DataTableHeader
                label="اسم المورد"
                sortKey="name"
                sortConfig={sortConfig}
                onSort={requestSort}
              />
            </TableHead>
            <TableHead>جهة الاتصال</TableHead>
            <TableHead>الهاتف</TableHead>
            <TableHead>البريد الإلكتروني</TableHead>
            <TableHead>عدد الطلبات</TableHead>
            <TableHead>
              <DataTableHeader
                label="إجمالي المشتريات"
                sortKey="totalPurchases"
                sortConfig={sortConfig}
                onSort={requestSort}
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
            <TableHead>الإجراءات</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.map((supplier: any) => {
            const stats = getSupplierStats(supplier.id);
            return (
              <TableRow key={supplier.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/suppliers/${supplier.id}`)}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.contact_person || "-"}</TableCell>
                <TableCell>
                  {supplier.phone ? (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {supplier.phone}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>
                  {supplier.email ? (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {supplier.email}
                    </div>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{stats.orderCount}</TableCell>
                <TableCell>{stats.totalAmount.toLocaleString()} ج.م</TableCell>
                <TableCell
                  className={
                    (supplier.current_balance || 0) > 0
                      ? "text-destructive"
                      : ""
                  }
                >
                  {(supplier.current_balance || 0).toLocaleString()} ج.م
                </TableCell>
                <TableCell>
                  <Badge variant={supplier.is_active ? "default" : "secondary"}>
                    {supplier.is_active ? "نشط" : "غير نشط"}
                  </Badge>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <DataTableActions
                    onEdit={() => handleEdit(supplier)}
                    onDelete={() => handleDelete(supplier.id)}
                    canView={false}
                    canEdit={canEdit}
                    canDelete={canDelete}
                    isDeleting={deletingId === supplier.id}
                    deleteDescription="سيتم حذف المورد. هذا الإجراء لا يمكن التراجع عنه."
                  />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الموردين</h1>
        <div className="flex gap-2">
          {!isMobile && (
            <ExportWithTemplateButton
              section="suppliers"
              sectionLabel="الموردين"
              data={suppliers}
              columns={[
                { key: 'name', label: 'اسم المورد' },
                { key: 'contact_person', label: 'جهة الاتصال' },
                { key: 'phone', label: 'الهاتف' },
                { key: 'email', label: 'البريد الإلكتروني' },
                { key: 'current_balance', label: 'الرصيد' },
                { key: 'is_active', label: 'الحالة' },
              ]}
            />
          )}
          {canEdit && (
            <Button onClick={handleAdd} size={isMobile ? "sm" : "default"}>
              <Plus className="h-4 w-4 ml-2" />
              {isMobile ? "جديد" : "مورد جديد"}
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isMobile ? renderMobileView() : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {statItems.map((stat, i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
                  <stat.icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث بالاسم أو الهاتف أو البريد..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select
              value={(filters.is_active as string) || 'all'}
              onValueChange={(v) => setFilter('is_active', v === 'all' ? undefined : v === 'true')}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="true">نشط</SelectItem>
                <SelectItem value="false">غير نشط</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Suppliers Table */}
          <Card>
            <CardHeader>
              <CardTitle>قائمة الموردين ({sortedData.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {renderTableView()}
            </CardContent>
          </Card>
        </>
      )}

      {/* Dialogs */}
      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplier}
      />
    </div>
  );
};

export default SuppliersPage;
