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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Warehouse,
  Package,
  AlertTriangle,
  ArrowRightLeft,
  Edit,
  Trash2,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import WarehouseFormDialog from "@/components/inventory/WarehouseFormDialog";
import StockMovementDialog from "@/components/inventory/StockMovementDialog";
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

const InventoryPage = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(null);

  // Fetch warehouses
  const { data: warehouses = [], isLoading: loadingWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("warehouses")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch product stock with product details
  const { data: productStock = [], isLoading: loadingStock } = useQuery({
    queryKey: ["product_stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_stock")
        .select(`
          *,
          product:products(id, name, sku, min_stock, image_url),
          warehouse:warehouses(id, name),
          variant:product_variants(id, name)
        `)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch recent stock movements
  const { data: recentMovements = [] } = useQuery({
    queryKey: ["stock_movements_recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          *,
          product:products(id, name),
          from_warehouse:warehouses!stock_movements_from_warehouse_id_fkey(id, name),
          to_warehouse:warehouses!stock_movements_to_warehouse_id_fkey(id, name)
        `)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Delete warehouse mutation
  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["warehouses"] });
      toast({ title: "تم حذف المستودع بنجاح" });
      setDeleteDialogOpen(false);
    },
    onError: () => {
      toast({ title: "خطأ في حذف المستودع", variant: "destructive" });
    },
  });

  // Filter stock by search term
  const filteredStock = productStock.filter((item: any) =>
    item.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.warehouse?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get low stock items
  const lowStockItems = productStock.filter(
    (item: any) => item.product?.min_stock && item.quantity <= item.product.min_stock
  );

  // Calculate stats
  const totalProducts = new Set(productStock.map((item: any) => item.product_id)).size;
  const totalQuantity = productStock.reduce((sum: number, item: any) => sum + item.quantity, 0);

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case "in": return "إدخال";
      case "out": return "إخراج";
      case "transfer": return "تحويل";
      case "adjustment": return "تعديل";
      default: return type;
    }
  };

  const getMovementTypeBadge = (type: string) => {
    switch (type) {
      case "in": return "default";
      case "out": return "destructive";
      case "transfer": return "secondary";
      case "adjustment": return "outline";
      default: return "default";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">إدارة المخزون</h1>
        <div className="flex gap-2">
          <Button onClick={() => setMovementDialogOpen(true)}>
            <ArrowRightLeft className="h-4 w-4 ml-2" />
            حركة مخزون
          </Button>
          <Button onClick={() => { setSelectedWarehouse(null); setWarehouseDialogOpen(true); }}>
            <Plus className="h-4 w-4 ml-2" />
            مستودع جديد
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المستودعات</CardTitle>
            <Warehouse className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{warehouses.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">المنتجات في المخزون</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">إجمالي الكميات</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">تنبيهات نقص المخزون</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock">المخزون</TabsTrigger>
          <TabsTrigger value="warehouses">المستودعات</TabsTrigger>
          <TabsTrigger value="movements">حركات المخزون</TabsTrigger>
          <TabsTrigger value="alerts">التنبيهات</TabsTrigger>
        </TabsList>

        {/* Stock Tab */}
        <TabsContent value="stock" className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="بحث في المخزون..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10"
              />
            </div>
          </div>

          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>المنتج</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>المتغير</TableHead>
                  <TableHead>المستودع</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>الحد الأدنى</TableHead>
                  <TableHead>الحالة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingStock ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : filteredStock.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد بيانات مخزون
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredStock.map((item: any) => {
                    const isLowStock = item.product?.min_stock && item.quantity <= item.product.min_stock;
                    return (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product?.name}</TableCell>
                        <TableCell>{item.product?.sku || "-"}</TableCell>
                        <TableCell>{item.variant?.name || "-"}</TableCell>
                        <TableCell>{item.warehouse?.name}</TableCell>
                        <TableCell>{item.quantity.toLocaleString()}</TableCell>
                        <TableCell>{item.product?.min_stock || "-"}</TableCell>
                        <TableCell>
                          {isLowStock ? (
                            <Badge variant="destructive">نقص مخزون</Badge>
                          ) : (
                            <Badge variant="default">متوفر</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Warehouses Tab */}
        <TabsContent value="warehouses" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>اسم المستودع</TableHead>
                  <TableHead>الموقع</TableHead>
                  <TableHead>الوصف</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingWarehouses ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      جاري التحميل...
                    </TableCell>
                  </TableRow>
                ) : warehouses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      لا توجد مستودعات
                    </TableCell>
                  </TableRow>
                ) : (
                  warehouses.map((warehouse: any) => (
                    <TableRow key={warehouse.id}>
                      <TableCell className="font-medium">{warehouse.name}</TableCell>
                      <TableCell>{warehouse.location || "-"}</TableCell>
                      <TableCell>{warehouse.description || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={warehouse.is_active ? "default" : "secondary"}>
                          {warehouse.is_active ? "نشط" : "غير نشط"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setSelectedWarehouse(warehouse);
                              setWarehouseDialogOpen(true);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setWarehouseToDelete(warehouse.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Movements Tab */}
        <TabsContent value="movements" className="space-y-4">
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>المنتج</TableHead>
                  <TableHead>نوع الحركة</TableHead>
                  <TableHead>من</TableHead>
                  <TableHead>إلى</TableHead>
                  <TableHead>الكمية</TableHead>
                  <TableHead>ملاحظات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentMovements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      لا توجد حركات مخزون
                    </TableCell>
                  </TableRow>
                ) : (
                  recentMovements.map((movement: any) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {new Date(movement.created_at).toLocaleDateString("ar-EG")}
                      </TableCell>
                      <TableCell className="font-medium">{movement.product?.name}</TableCell>
                      <TableCell>
                        <Badge variant={getMovementTypeBadge(movement.movement_type) as any}>
                          {getMovementTypeLabel(movement.movement_type)}
                        </Badge>
                      </TableCell>
                      <TableCell>{movement.from_warehouse?.name || "-"}</TableCell>
                      <TableCell>{movement.to_warehouse?.name || "-"}</TableCell>
                      <TableCell>{movement.quantity.toLocaleString()}</TableCell>
                      <TableCell>{movement.notes || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                تنبيهات نقص المخزون
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lowStockItems.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  لا توجد تنبيهات حالياً
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>المستودع</TableHead>
                      <TableHead>الكمية الحالية</TableHead>
                      <TableHead>الحد الأدنى</TableHead>
                      <TableHead>النقص</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lowStockItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.product?.name}</TableCell>
                        <TableCell>{item.warehouse?.name}</TableCell>
                        <TableCell className="text-destructive font-bold">
                          {item.quantity.toLocaleString()}
                        </TableCell>
                        <TableCell>{item.product?.min_stock}</TableCell>
                        <TableCell className="text-destructive">
                          {(item.product.min_stock - item.quantity).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <WarehouseFormDialog
        open={warehouseDialogOpen}
        onOpenChange={setWarehouseDialogOpen}
        warehouse={selectedWarehouse}
      />

      <StockMovementDialog
        open={movementDialogOpen}
        onOpenChange={setMovementDialogOpen}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>
              سيتم حذف المستودع نهائياً. هذا الإجراء لا يمكن التراجع عنه.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => warehouseToDelete && deleteWarehouseMutation.mutate(warehouseToDelete)}
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

export default InventoryPage;
