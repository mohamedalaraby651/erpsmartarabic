import { WorkspaceTable, type WorkspaceColumn } from "@/components/table/WorkspaceTable";
import { TableViewOptions } from "@/components/table/TableViewOptions";
import { useTableLayout } from "@/hooks/useTableLayout";
import { MobileExpandableCard } from "@/components/ui/data/MobileExpandableCard";
import { LoadMoreFooter } from "@/components/ui/data/LoadMoreFooter";
import { Amount } from "@/components/shared/amount/Amount";
import { useCallback } from "react";
import { useNavigate } from "@/lib/router-compat";
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
import { DataCard } from "@/components/mobile/DataCard";
import { PullToRefresh } from "@/components/mobile/PullToRefresh";
import { MobileListSkeleton } from "@/components/mobile/MobileListSkeleton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ListErrorState } from "@/components/shared/ListErrorState";
import { ListStateRenderer } from "@/components/shared/ListStateRenderer";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { TableSkeleton } from "@/components/ui/table-skeleton";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { useProductsList, type Product } from "@/hooks/products/useProductsList";

const COLUMN_KEYS = ['name', 'category', 'price', 'stock', 'status', 'actions'];

const ProductsPage = () => {
  const layout = useTableLayout('products', COLUMN_KEYS);
  const navigate = useNavigate();
  const { isMobile } = useResponsiveView();
  const list = useProductsList();

  const renderProductCard = useCallback((product: Product) => {
    const stock = list.getProductStock(product.id);
    const isLowStock = stock <= (product.min_stock || 0);
    return (
      <MobileExpandableCard key={product.id}
        title={<Button variant="link" className="h-auto min-h-11 whitespace-normal px-0 text-start" onClick={() => navigate(`/products/${product.id}`)}>{product.name}</Button>}
        amount={<Amount value={Number(product.selling_price)} />}
        status={isLowStock ? <Badge variant="destructive">مخزون منخفض</Badge> : <Badge variant={product.is_active ? 'default' : 'secondary'}>{product.is_active ? 'نشط' : 'غير نشط'}</Badge>}
        details={[{ label: 'الكود', value: product.sku || '-' }, { label: 'التصنيف', value: list.getCategoryName(product.category_id) }, { label: 'المخزون', value: stock }]}
        actions={<DataTableActions onView={() => navigate(`/products/${product.id}`)} onEdit={() => list.handleEdit(product)} onDelete={() => list.handleDelete(product.id)} canEdit={list.canEdit} canDelete={list.canDelete} isDeleting={list.deletingId === product.id} />}
      />
    );
  }, [navigate, list.canEdit, list.canDelete, list.handleEdit, list.handleDelete, list.getProductStock, list.getCategoryName]);

  const renderMobileView = () => {
    const hasFilters = !!list.searchQuery || list.categoryFilter !== 'all';
    return (
      <PullToRefresh onRefresh={list.handleRefresh}>
        <ListStateRenderer
          data={list.sortedData}
          isLoading={list.isLoading}
          error={list.error}
          hasFilters={hasFilters}
          onRetry={() => list.refetch()}
          onClearFilters={() => { list.setSearchQuery(''); list.setCategoryFilter('all'); }}
          empty={{
            icon: Package,
            title: 'لا توجد منتجات',
            description: 'ابدأ بإضافة منتجك الأول لإدارة المخزون والمبيعات.',
            action: list.canEdit ? { label: 'إضافة منتج', onClick: list.handleAdd, icon: Plus } : undefined,
          }}
          skeletonVariant="product"
          skeletonCount={6}
        >
          <div className="space-y-3">{list.sortedData.map(renderProductCard)}</div>
        </ListStateRenderer>
      </PullToRefresh>
    );
  };

  const columns: WorkspaceColumn<Product>[] = [
    { key: 'name', label: 'المنتج', onSort: () => list.requestSort('name'), sortDirection: list.sortConfig.key === 'name' ? list.sortConfig.direction : null, render: product => <div className="flex items-center gap-2">{product.image_url && <img src={product.image_url} alt={product.name} className="h-10 w-10 rounded-md object-cover" />}<div><Button variant="link" className="h-auto min-h-11 whitespace-normal px-0 text-start" onClick={() => navigate(`/products/${product.id}`)}>{product.name}</Button><div className="text-xs text-muted-foreground">{product.sku || '-'}</div></div></div> },
    { key: 'category', label: 'التصنيف', render: product => list.getCategoryName(product.category_id) },
    { key: 'price', label: 'سعر البيع', onSort: () => list.requestSort('selling_price'), sortDirection: list.sortConfig.key === 'selling_price' ? list.sortConfig.direction : null, render: product => <Amount value={Number(product.selling_price)} /> },
    { key: 'stock', label: 'المخزون', render: product => <span className={list.getProductStock(product.id) <= (product.min_stock || 0) ? 'text-warning font-bold' : 'tabular-nums'}>{list.getProductStock(product.id)}</span> },
    { key: 'status', label: 'الحالة', render: product => <Badge variant={product.is_active ? 'default' : 'secondary'}>{product.is_active ? 'نشط' : 'غير نشط'}</Badge> },
    { key: 'actions', label: 'إجراءات', render: product => <DataTableActions onView={() => navigate(`/products/${product.id}`)} onEdit={() => list.handleEdit(product)} onDelete={() => list.handleDelete(product.id)} canEdit={list.canEdit} canDelete={list.canDelete} isDeleting={list.deletingId === product.id} /> },
  ];

  const renderTableView = () => {
    if (list.isLoading) return <TableSkeleton rows={5} columns={7} />;
    if (list.error) return <ListErrorState error={list.error} onRetry={() => list.refetch()} />;
    if (list.sortedData.length === 0) return <EmptyState icon={Package} title="لا توجد منتجات" description="ابدأ بإضافة منتجك الأول" action={list.canEdit ? { label: 'إضافة منتج جديد', onClick: list.handleAdd, icon: Plus } : undefined} />;
    return <WorkspaceTable rows={list.sortedData} columns={columns} layout={layout} />;
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
        <div className="space-y-5">
          {/* 1. Search — primary, top of view */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="بحث بالاسم أو الكود..."
              value={list.searchQuery}
              onChange={(e) => list.setSearchQuery(e.target.value)}
              className="pr-10 h-11"
              inputMode="search"
            />
          </div>

          {/* 2. Stats chips — secondary, compact */}
          <ScrollArea className="w-full">
            <div className="flex gap-2.5 pb-1">
              {[
                { icon: Package, value: list.stats.total, label: 'الإجمالي', color: 'text-primary', bgColor: 'bg-primary/10' },
                { icon: Package, value: list.stats.active, label: 'نشط', color: 'text-success', bgColor: 'bg-success/10' },
                { icon: AlertTriangle, value: list.stats.lowStock, label: 'مخزون منخفض', color: 'text-warning', bgColor: 'bg-warning/10' },
                { icon: Layers, value: list.stats.categories, label: 'التصنيفات', color: 'text-info', bgColor: 'bg-info/10' },
              ].map((stat, i) => (
                <Card key={i} className="min-w-[130px] shrink-0 border-border/60 shadow-xs">
                  <CardContent className="p-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-md ${stat.bgColor}`}><stat.icon className={`h-3.5 w-3.5 ${stat.color}`} /></div>
                      <div className="min-w-0">
                        <p className="text-base font-bold tabular-nums leading-tight">{stat.value}</p>
                        <p className="text-[11px] text-muted-foreground leading-tight truncate">{stat.label}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          {/* 3. Results */}
          <div className="pb-20">{renderMobileView()}</div>
        </div>
      ) : (
        <>
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

          <Card><CardContent className="p-3 md:p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="بحث بالاسم أو الكود..." value={list.searchQuery} onChange={(e) => list.setSearchQuery(e.target.value)} className="pr-10" />
              </div>
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
            </div>
          </CardContent></Card>

          <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>قائمة المنتجات ({list.sortedData.length})</CardTitle><TableViewOptions layout={layout} columns={columns} /></CardHeader><CardContent>{renderTableView()}</CardContent></Card>
        </>
      )}


      <LoadMoreFooter shown={list.products.length} total={list.totalCount} hasMore={list.products.length < list.totalCount} loading={list.isFetching} onLoadMore={list.loadMore} />
      <ProductFormDialog open={list.dialogOpen} onOpenChange={list.setDialogOpen} product={list.selectedProduct} />
      <ProductImportDialog open={list.importDialogOpen} onOpenChange={list.setImportDialogOpen} />
    </div>
  );
};

export default ProductsPage;
