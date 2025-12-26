import { useState } from "react";
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
import {
  Plus,
  Search,
  Users,
  Phone,
  Mail,
  Edit,
  Trash2,
  Eye,
  Download,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import SupplierFormDialog from "@/components/suppliers/SupplierFormDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SuppliersPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [supplierToDelete, setSupplierToDelete] = useState<string | null>(null);

  // Fetch suppliers
  const { data: suppliers = [], isLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");
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
      toast({ title: "تم حذف المورد بنجاح" });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({ title: "خطأ في حذف المورد", variant: "destructive" });
    },
  });

  // Filter suppliers
  const filteredSuppliers = suppliers.filter((supplier: any) => {
    const matchesSearch =
      supplier.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.phone?.includes(searchTerm) ||
      supplier.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && supplier.is_active) ||
      (statusFilter === "inactive" && !supplier.is_active);
    return matchesSearch && matchesStatus;
  });

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة الموردين</h1>
        <div className="flex gap-2">
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
          <Button onClick={() => { setSelectedSupplier(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            مورد جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الموردين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{suppliers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">الموردين النشطين</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{activeSuppliers}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي المشتريات</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPurchases.toLocaleString()} ج.م</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الأرصدة</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBalance.toLocaleString()} ج.م</div>
          </CardContent>
        </Card>
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="الحالة" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">الكل</SelectItem>
            <SelectItem value="active">نشط</SelectItem>
            <SelectItem value="inactive">غير نشط</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Suppliers Table */}
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>اسم المورد</TableHead>
              <TableHead>جهة الاتصال</TableHead>
              <TableHead>الهاتف</TableHead>
              <TableHead>البريد الإلكتروني</TableHead>
              <TableHead>عدد الطلبات</TableHead>
              <TableHead>إجمالي المشتريات</TableHead>
              <TableHead>الرصيد</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead>الإجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8">
                  جاري التحميل...
                </TableCell>
              </TableRow>
            ) : filteredSuppliers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  لا يوجد موردين
                </TableCell>
              </TableRow>
            ) : (
              filteredSuppliers.map((supplier: any) => {
                const stats = getSupplierStats(supplier.id);
                return (
                  <TableRow key={supplier.id}>
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
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedSupplier(supplier);
                            setDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSupplierToDelete(supplier.id);
                            setDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Dialogs */}
      <SupplierFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        supplier={selectedSupplier}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المورد نهائياً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => supplierToDelete && deleteSupplierMutation.mutate(supplierToDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SuppliersPage;
