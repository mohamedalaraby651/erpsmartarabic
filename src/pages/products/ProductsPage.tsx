import { useState } from "react";
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
import { Plus, Search, Package, AlertTriangle, Layers } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// Mobile components
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TableSkeleton } from "@/components/ui/table-skeleton";

type Product = Database['public']['Tables']['products']['Row'];
type ProductCategory = Database['public']['Tables']['product_categories']['Row'];

const ProductsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const { isMobile, isTableView } = useResponsiveView();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const canEdit = userRole === 'admin' || userRole === 'warehouse';
  const canDelete = userRole === 'admin';

  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['products', searchQuery, categoryFilter],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });

      if (searchQuery) {
        query = query.or(`name.ilike.%${searchQuery}%,sku.ilike.%${searchQuery}%`);
      }
      if (categoryFilter !== 'all') {
        query = query.eq('category_id', categoryFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data as ProductCategory[];
    },
  });

  const { data: stockData = [] } = useQuery({
    queryKey: ['product-stock-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_stock')
        .select('product_id, quantity');
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('تم حذف المنتج بنجاح');
      setDeletingId(null);
    },
    onError: () => {
      toast.error('فشل حذف المنتج');
      setDeletingId(null);
    },
  });

  const getProductStock = (productId: string) => {
    const stocks = stockData.filter(s => s.product_id === productId);
    return stocks.reduce((sum, s) => sum + s.quantity, 0);
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return '-';
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || '-';
  };

  // Filtering
  const { filteredData, filters, setFilter } = useTableFilter(products);

  // Sorting
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setSelectedProduct(null);
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    deleteMutation.mutate(id);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    lowStock: products.filter(p => getProductStock(p.id) <= (p.min_stock || 0)).length,
    categories: categories.length,
  };

  // Render mobile list view
  const renderMobileView = () => {
    if (isLoading) {
      return <MobileListSkeleton count={5} />;
    }

    if (sortedData.length === 0) {
      return (
        <EmptyState
          icon={Package}
          title="لا توجد منتجات"
          description="ابدأ بإضافة منتجك الأول"
          action={canEdit ? { label: 'إضافة منتج', onClick: handleAdd, icon: Plus } : undefined}
        />
      );
    }

    return (
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="space-y-3">
          {sortedData.map((product) => {
            const stock = getProductStock(product.id);
            const isLowStock = stock <= (product.min_stock || 0);
            
            return (
              <DataCard
                key={product.id}
                title={product.name}
                subtitle={product.sku ? `كود: ${product.sku}` : getCategoryName(product.category_id)}
                avatar={product.image_url || undefined}
                avatarFallback={product.name.slice(0, 2)}
                icon={<Package className="h-5 w-5" />}
                badge={isLowStock ? {
                  text: 'مخزون منخفض',
                  variant: 'destructive',
                } : undefined}
                fields={[
                  { label: 'السعر', value: `${Number(product.selling_price).toLocaleString()} ج.م` },
                  { label: 'المخزون', value: stock.toString(), icon: isLowStock ? <AlertTriangle className="h-3 w-3" /> : undefined },
                ]}
                onClick={() => navigate(`/products/${product.id}`)}
                onView={() => navigate(`/products/${product.id}`)}
                onEdit={canEdit ? () => handleEdit(product) : undefined}
                onDelete={canDelete ? () => handleDelete(product.id) : undefined}
              />
            );
          })}
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
          icon={Package}
          title="لا توجد منتجات"
          description="ابدأ بإضافة منتجك الأول"
          action={canEdit ? { label: 'إضافة منتج جديد', onClick: handleAdd, icon: Plus } : undefined}
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
                  label="المنتج"
                  sortKey="name"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </TableHead>
              <TableHead>الكود</TableHead>
              <TableHead>التصنيف</TableHead>
              <TableHead>
                <DataTableHeader
                  label="سعر البيع"
                  sortKey="selling_price"
                  sortConfig={sortConfig}
                  onSort={requestSort}
                />
              </TableHead>
              <TableHead>المخزون</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.map((product) => {
              const stock = getProductStock(product.id);
              const isLowStock = stock <= (product.min_stock || 0);
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <code className="text-sm bg-muted px-2 py-1 rounded">
                      {product.sku || '-'}
                    </code>
                  </TableCell>
                  <TableCell>{getCategoryName(product.category_id)}</TableCell>
                  <TableCell>
                    <span className="font-bold">
                      {Number(product.selling_price).toLocaleString()} ج.م
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={isLowStock ? 'text-destructive font-bold' : ''}>
                        {stock}
                      </span>
                      {isLowStock && (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={product.is_active ? "default" : "secondary"}>
                      {product.is_active ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DataTableActions
                      onView={() => navigate(`/products/${product.id}`)}
                      onEdit={() => handleEdit(product)}
                      onDelete={() => handleDelete(product.id)}
                      canEdit={canEdit}
                      canDelete={canDelete}
                      isDeleting={deletingId === product.id}
                      deleteDescription="سيتم حذف المنتج. هذا الإجراء لا يمكن التراجع عنه."
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">إدارة المنتجات</h1>
          <p className="text-sm text-muted-foreground">إدارة المنتجات والمخزون</p>
        </div>
        {!isMobile && (
          <div className="flex gap-2">
            <ExportWithTemplateButton
              section="products"
              sectionLabel="المنتجات"
              data={products}
              columns={[
                { key: 'name', label: 'اسم المنتج' },
                { key: 'sku', label: 'الكود' },
                { key: 'cost_price', label: 'سعر التكلفة' },
                { key: 'selling_price', label: 'سعر البيع' },
                { key: 'min_stock', label: 'الحد الأدنى' },
                { key: 'is_active', label: 'الحالة' },
              ]}
            />
            {canEdit && (
              <Button onClick={handleAdd}>
                <Plus className="h-4 w-4 ml-2" />
                إضافة منتج
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Stats Cards - Horizontal scroll on mobile */}
      {isMobile ? (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {[
              { icon: Package, value: stats.total, label: 'الإجمالي', color: 'text-primary' },
              { icon: Package, value: stats.active, label: 'نشط', color: 'text-success' },
              { icon: AlertTriangle, value: stats.lowStock, label: 'مخزون منخفض', color: 'text-warning' },
              { icon: Layers, value: stats.categories, label: 'التصنيفات', color: 'text-info' },
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Package className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">إجمالي المنتجات</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <Package className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-sm text-muted-foreground">منتجات نشطة</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.lowStock}</p>
                  <p className="text-sm text-muted-foreground">مخزون منخفض</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-info/10">
                  <Layers className="h-5 w-5 text-info" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.categories}</p>
                  <p className="text-sm text-muted-foreground">التصنيفات</p>
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
                placeholder="بحث بالاسم أو الكود..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            {!isMobile && (
              <>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="التصنيف" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل التصنيفات</SelectItem>
                    {categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select 
                  value={(filters.is_active as string) || 'all'} 
                  onValueChange={(v) => setFilter('is_active', v === 'all' ? undefined : v === 'true')}
                >
                  <SelectTrigger className="w-full sm:w-40">
                    <SelectValue placeholder="الحالة" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="true">نشط</SelectItem>
                    <SelectItem value="false">غير نشط</SelectItem>
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
            <CardTitle>قائمة المنتجات ({sortedData.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {renderTableView()}
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Product Dialog */}
      <ProductFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        product={selectedProduct}
      />
    </div>
  );
};

export default ProductsPage;
