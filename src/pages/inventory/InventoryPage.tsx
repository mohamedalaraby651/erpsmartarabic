import { useState, useCallback, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Warehouse, Package, AlertTriangle, ArrowRightLeft } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import WarehouseFormDialog from "@/components/inventory/WarehouseFormDialog";
import StockMovementDialog from "@/components/inventory/StockMovementDialog";
import { InventoryStockTab } from "@/components/inventory/InventoryStockTab";
import { InventoryWarehousesTab } from "@/components/inventory/InventoryWarehousesTab";
import { InventoryMovementsTab } from "@/components/inventory/InventoryMovementsTab";
import { InventoryAlertsTab } from "@/components/inventory/InventoryAlertsTab";
import type { Database } from "@/integrations/supabase/types";

type WarehouseRow = Database['public']['Tables']['warehouses']['Row'];

const InventoryPage = () => {
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(null);

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setWarehouseDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: warehouses = [], isLoading: loadingWarehouses, refetch: refetchWarehouses } = useQuery({
    queryKey: ["warehouses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("warehouses").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: productStock = [], isLoading: loadingStock, refetch: refetchStock } = useQuery({
    queryKey: ["product_stock"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_stock")
        .select("*, product:products(id, name, sku, min_stock, image_url), warehouse:warehouses(id, name), variant:product_variants(id, name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: recentMovements = [], refetch: refetchMovements } = useQuery({
    queryKey: ["stock_movements_recent"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stock_movements")
        .select("*, product:products(id, name), from_warehouse:warehouses!stock_movements_from_warehouse_id_fkey(id, name), to_warehouse:warehouses!stock_movements_to_warehouse_id_fkey(id, name)")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  const deleteWarehouseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("warehouses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["warehouses"] }); toast({ title: "تم حذف المستودع بنجاح" }); setDeleteDialogOpen(false); },
    onError: () => { toast({ title: "خطأ في حذف المستودع", variant: "destructive" }); },
  });

  const handleRefresh = useCallback(async () => {
    await Promise.all([refetchWarehouses(), refetchStock(), refetchMovements()]);
  }, [refetchWarehouses, refetchStock, refetchMovements]);

  const lowStockItems = productStock.filter((item: any) => item.product?.min_stock && item.quantity <= item.product.min_stock);
  const totalProducts = new Set(productStock.map((item: any) => item.product_id)).size;
  const totalQuantity = productStock.reduce((sum: number, item: any) => sum + item.quantity, 0);

  const pageContent = (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">إدارة المخزون</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={() => setMovementDialogOpen(true)} className="flex-1 sm:flex-none">
            <ArrowRightLeft className="h-4 w-4 ml-2" />{!isMobile && "حركة مخزون"}
          </Button>
          <Button onClick={() => { setSelectedWarehouse(null); setWarehouseDialogOpen(true); }} className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 ml-2" />{!isMobile && "مستودع جديد"}
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">المستودعات</CardTitle><Warehouse className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{warehouses.length}</div></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">المنتجات</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalProducts}</div></CardContent></Card>
        {!isMobile && (
          <>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">إجمالي الكميات</CardTitle><Package className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{totalQuantity.toLocaleString()}</div></CardContent></Card>
            <Card><CardHeader className="flex flex-row items-center justify-between pb-2"><CardTitle className="text-sm font-medium">تنبيهات نقص</CardTitle><AlertTriangle className="h-4 w-4 text-destructive" /></CardHeader><CardContent><div className="text-2xl font-bold text-destructive">{lowStockItems.length}</div></CardContent></Card>
          </>
        )}
      </div>

      <Tabs defaultValue="stock" className="space-y-4">
        <TabsList className={isMobile ? "grid grid-cols-4 w-full" : ""}>
          <TabsTrigger value="stock">المخزون</TabsTrigger>
          <TabsTrigger value="warehouses">المستودعات</TabsTrigger>
          <TabsTrigger value="movements">الحركات</TabsTrigger>
          <TabsTrigger value="alerts" className="relative">
            التنبيهات
            {lowStockItems.length > 0 && (
              <Badge variant="destructive" className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center">{lowStockItems.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock"><InventoryStockTab stock={productStock as any} isLoading={loadingStock} searchTerm={searchTerm} onSearchChange={setSearchTerm} /></TabsContent>
        <TabsContent value="warehouses"><InventoryWarehousesTab warehouses={warehouses} isLoading={loadingWarehouses} onEdit={(w) => { setSelectedWarehouse(w); setWarehouseDialogOpen(true); }} onDelete={(id) => { setWarehouseToDelete(id); setDeleteDialogOpen(true); }} onAdd={() => { setSelectedWarehouse(null); setWarehouseDialogOpen(true); }} /></TabsContent>
        <TabsContent value="movements"><InventoryMovementsTab movements={recentMovements as any} onAddMovement={() => setMovementDialogOpen(true)} /></TabsContent>
        <TabsContent value="alerts"><InventoryAlertsTab items={lowStockItems as any} /></TabsContent>
      </Tabs>

      <WarehouseFormDialog open={warehouseDialogOpen} onOpenChange={setWarehouseDialogOpen} warehouse={selectedWarehouse} />
      <StockMovementDialog open={movementDialogOpen} onOpenChange={setMovementDialogOpen} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>هل أنت متأكد؟</AlertDialogTitle>
            <AlertDialogDescription>سيتم حذف هذا المستودع نهائياً ولا يمكن التراجع عن هذا الإجراء.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction onClick={() => warehouseToDelete && deleteWarehouseMutation.mutate(warehouseToDelete)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">حذف</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );

  return isMobile ? <PullToRefresh onRefresh={handleRefresh}>{pageContent}</PullToRefresh> : pageContent;
};

export default InventoryPage;
