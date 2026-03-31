import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, Package, AlertTriangle, Layers, Upload } from "lucide-react";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import ProductImportDialog from "@/components/products/ProductImportDialog";
import { ExportWithTemplateButton } from "@/components/export/ExportWithTemplateButton";
import { DataTableHeader } from "@/components/ui/data-table-header";
import { DataTableActions } from "@/components/ui/data-table-actions";
import { useResponsiveView } from "@/hooks/useResponsiveView";
import { VirtualizedList } from "@/components/table/VirtualizedList";
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { useProductsList, type Product } from "@/hooks/products/useProductsList";

const ProductsPage = () => {
  const navigate = useNavigate();
  const { isMobile } = useResponsiveView();
  const list = useProductsList();

  const renderProductCard = useCallback((product: Product) => {
    const stock = list.getProductStock(product.id);
    const isLowStock = stock <= (product.min_stock || 0);
    return (
      <DataCard
        key={product.id}
        title={product.name}
        subtitle={product.sku ? `كود: ${product.sku}` : list.getCategoryName(product.category_id)}
        avatar={product.image_url || undefined}
        avatarFallback={product.name.slice(0, 2)}
        icon={<Package className="h-5 w-5" />}
        badge={isLowStock ? { text: 'مخزون منخفض', variant: 'destructive' } : undefined}
        fields={[
          { label: 'السعر', value: `${Number(product.selling_price).toLocaleString()} ج.م` },
          { label: 'المخزون', value: stock.toString(), icon: isLowStock ? <AlertTriangle className="h-3 w-3" /> : undefined },
        ]}
        onClick={() => navigate(`/products/${product.id}`)}
        onView={() => navigate(`/products/${product.id}`)}
        onEdit={list.canEdit ? () => list.handleEdit(product) : undefined}
        onDelete={list.canDelete ? () => list.handleDelete(product.id) : undefined}
      />
    );
  }, [navigate, list.canEdit, list.canDelete, list.handleEdit, list.handleDelete, list.getProductStock, list.getCategoryName]);

  const renderMobileView = () => {
    if (list.isLoading) return <MobileListSkeleton count={5} />;
    if (list.sortedData.length === 0) return <EmptyState icon={Package} title="لا توجد منتجات" description="ابدأ بإضافة منتجك الأول" action={list.canEdit ? { label: 'إضافة منتج', onClick: list.handleAdd, icon: Plus } : undefined} />;
    if (list.sortedData.length > 50) {
      return (
        <PullToRefresh onRefresh={list.handleRefresh}>
          <VirtualizedList data={list.sortedData} renderItem={renderProductCard} getItemKey={(p) => p.id} itemHeight={140} maxHeight={window.innerHeight - 280} gap={12} className="px-1" />
        </PullToRefresh>
      );
    }
    return (
      <PullToRefresh onRefresh={list.handleRefresh}>
        <div className="space-y-3">{list.sortedData.map(renderProductCard)}</div>
      </PullToRefresh>
    );
  };

  const renderTableView = () => {
    if (list.isLoading) return <TableSkeleton rows={5} columns={7} />;
    if (list.sortedData.length === 0) return <EmptyState icon={Package} title="لا توجد منتجات" description="ابدأ بإضافة منتجك الأول" action={list.canEdit ? { label: 'إضافة منتج جديد', onClick: list.handleAdd, icon: Plus } : undefined} />;
    return (
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead><DataTableHeader label="المنتج" sortKey="name" sortConfig={list.sortConfig} onSort={list.requestSort} /></TableHead>
              <TableHead>الكود</TableHead>
              <TableHead>التصنيف</TableHead>
              <TableHead><DataTableHeader label="سعر البيع" sortKey="selling_price" sortConfig={list.sortConfig} onSort={list.requestSort} /></TableHead>
              <TableHead>المخزون</TableHead>
              <TableHead>الحالة</TableHead>
              <TableHead className="text-left">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {list.sortedData.map((product) => {
              const stock = list.getProductStock(product.id);
              const isLowStock = stock <= (product.min_stock || 0);
              return (
                <TableRow key={product.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded-lg object-cover" />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center"><Package className="h-5 w-5 text-muted-foreground" /></div>
                      )}
                      <div>
                        <p className="font-medium">{product.name}</p>
                        {product.description && <p className="text-sm text-muted-foreground line-clamp-1">{product.description}</p>}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><code className="text-sm bg-muted px-2 py-1 rounded">{product.sku || '-'}</code></TableCell>
                  <TableCell>{list.getCategoryName(product.category_id)}</TableCell>
                  <TableCell><span className="font-bold">{Number(product.selling_price).toLocaleString()} ج.م</span></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={isLowStock ? 'text-destructive font-bold' : ''}>{stock}</span>
                      {isLowStock && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </div>
                  </TableCell>
                  <TableCell><Badge variant={product.is_active ? "default" : "secondary"}>{product.is_active ? "نشط" : "غير نشط"}</Badge></TableCell>
                  <TableCell>
                    <DataTableActions onView={() => navigate(`/products/${product.id}`)} onEdit={() => list.handleEdit(product)} onDelete={() => list.handleDelete(product.id)} canEdit={list.canEdit} canDelete={list.canDelete} isDeleting={list.deletingId === product.id} deleteDescription="سيتم حذف المنتج. هذا الإجراء لا يمكن التراجع عنه." />
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div><h1 className="text-xl md:text-2xl font-bold">إدارة المنتجات</h1><p className="text-sm text-muted-foreground">إدارة المنتجات والمخزون</p></div>
        <div className="flex gap-2">
          {!isMobile && <ExportWithTemplateButton section="products" sectionLabel="المنتجات" data={list.products} columns={[{ key: 'name', label: 'اسم المنتج' }, { key: 'sku', label: 'الكود' }, { key: 'cost_price', label: 'سعر التكلفة' }, { key: 'selling_price', label: 'سعر البيع' }, { key: 'min_stock', label: 'الحد الأدنى' }, { key: 'is_active', label: 'الحالة' }]} />}
          {list.canEdit && <Button variant="outline" size={isMobile ? "sm" : "default"} onClick={() => list.setImportDialogOpen(true)}><Upload className="h-4 w-4 ml-2" />{isMobile ? "استيراد" : "استيراد من Excel"}</Button>}
          {list.canEdit && <Button onClick={list.handleAdd} size={isMobile ? "sm" : "default"}><Plus className="h-4 w-4 ml-2" />{isMobile ? "جديد" : "إضافة منتج"}</Button>}
        </div>
      </div>

      {isMobile ? (
        <ScrollArea className="w-full">
          <div className="flex gap-3 pb-2">
            {[
              { icon: Package, value: list.stats.total, label: 'الإجمالي', color: 'text-primary' },
              { icon: Package, value: list.stats.active, label: 'نشط', color: 'text-success' },
              { icon: AlertTriangle, value: list.stats.lowStock, label: 'مخزون منخفض', color: 'text-warning' },
              { icon: Layers, value: list.stats.categories, label: 'التصنيفات', color: 'text-info' },
            ].map((stat, i) => (
              <Card key={i} className="min-w-[110px] shrink-0"><CardContent className="p-3">
                <div className="flex items-center gap-2"><stat.icon className={`h-4 w-4 ${stat.color}`} /><div><p className="text-lg font-bold">{stat.value}</p><p className="text-xs text-muted-foreground">{stat.label}</p></div></div>
              </CardContent></Card>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Package, value: list.stats.total, label: 'إجمالي المنتجات', bgColor: 'bg-primary/10', color: 'text-primary' },
            { icon: Package, value: list.stats.active, label: 'منتجات نشطة', bgColor: 'bg-success/10', color: 'text-success' },
            { icon: AlertTriangle, value: list.stats.lowStock, label: 'مخزون منخفض', bgColor: 'bg-warning/10', color: 'text-warning' },
            { icon: Layers, value: list.stats.categories, label: 'التصنيفات', bgColor: 'bg-info/10', color: 'text-info' },
          ].map((stat, i) => (
            <Card key={i}><CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bgColor}`}><stat.icon className={`h-5 w-5 ${stat.color}`} /></div>
                <div><p className="text-2xl font-bold">{stat.value}</p><p className="text-sm text-muted-foreground">{stat.label}</p></div>
              </div>
            </CardContent></Card>
          ))}
        </div>
      )}

      <Card><CardContent className="p-3 md:p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="بحث بالاسم أو الكود..." value={list.searchQuery} onChange={(e) => list.setSearchQuery(e.target.value)} className="pr-10" />
          </div>
          {!isMobile && (
            <>
              <Select value={list.categoryFilter} onValueChange={list.setCategoryFilter}>
                <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="التصنيف" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل التصنيفات</SelectItem>
                  {list.categories.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={(list.filters.is_active as string) || 'all'} onValueChange={(v) => list.setFilter('is_active', v === 'all' ? undefined : v === 'true')}>
                <SelectTrigger className="w-full sm:w-40"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent><SelectItem value="all">الكل</SelectItem><SelectItem value="true">نشط</SelectItem><SelectItem value="false">غير نشط</SelectItem></SelectContent>
              </Select>
            </>
          )}
        </div>
      </CardContent></Card>

      {isMobile ? <div className="pb-20">{renderMobileView()}</div> : (
        <Card><CardHeader><CardTitle>قائمة المنتجات ({list.sortedData.length})</CardTitle></CardHeader><CardContent>{renderTableView()}</CardContent></Card>
      )}

      <ServerPagination currentPage={list.pagination.currentPage} totalPages={list.pagination.totalPages} totalCount={list.totalCount} pageSize={list.PAGE_SIZE} onPageChange={list.pagination.goToPage} hasNextPage={list.pagination.hasNextPage} hasPrevPage={list.pagination.hasPrevPage} />
      <ProductFormDialog open={list.dialogOpen} onOpenChange={list.setDialogOpen} product={list.selectedProduct} />
      <ProductImportDialog open={list.importDialogOpen} onOpenChange={list.setImportDialogOpen} />
    </div>
  );
};

export default ProductsPage;
