import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { ArrowRight, Edit, Plus, Package, Trash2, Layers, Box, Paperclip, ShoppingCart, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ProductFormDialog from "@/components/products/ProductFormDialog";
import ProductVariantDialog from "@/components/products/ProductVariantDialog";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { MobileStatsScroll } from "@/components/shared/MobileStatsScroll";
import { MobileDetailItems, type DetailItemData } from "@/components/mobile/MobileDetailItems";
import MobileDetailSection from "@/components/mobile/MobileDetailSection";
import { useIsMobile } from "@/hooks/use-mobile";
import { FloatingActionButton } from "@/components/mobile/FloatingActionButton";
import StockMovementDialog from "@/components/inventory/StockMovementDialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];
type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
type ProductStock = Database['public']['Tables']['product_stock']['Row'] & {
  warehouses?: { name: string } | null;
};

const ProductDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [variantDialogOpen, setVariantDialogOpen] = useState(false);
  const [stockMovementOpen, setStockMovementOpen] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('*').eq('id', id!).single();
      if (error) throw error;
      return data as Product;
    },
    enabled: !!id,
  });

  const { data: category } = useQuery({
    queryKey: ['product-category', product?.category_id],
    queryFn: async () => {
      if (!product?.category_id) return null;
      const { data, error } = await supabase.from('product_categories').select('*').eq('id', product.category_id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!product?.category_id,
  });

  const { data: variants = [] } = useQuery({
    queryKey: ['product-variants', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_variants').select('*').eq('product_id', id!).order('created_at', { ascending: false });
      if (error) throw error;
      return data as ProductVariant[];
    },
    enabled: !!id,
  });

  const { data: stockData = [] } = useQuery({
    queryKey: ['product-stock', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_stock').select('*, warehouses(name)').eq('product_id', id!);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const totalStock = stockData.reduce((sum, s) => sum + s.quantity, 0);
  const isLowStock = totalStock <= (product?.min_stock || 0);

  const deleteVariantMutation = useMutation({
    mutationFn: async (variantId: string) => {
      const { error } = await supabase.from('product_variants').delete().eq('id', variantId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-variants', id] });
      toast({ title: "تم حذف المتغير بنجاح" });
    },
  });

  if (isLoading) return <DetailPageSkeleton variant="product" tabCount={3} />;

  if (!product) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">المنتج غير موجود</p>
        <Button variant="link" onClick={() => navigate('/products')}>العودة للمنتجات</Button>
      </div>
    );
  }

  const mobileStats = [
    { icon: Package, value: `${Number(product.selling_price).toLocaleString()}`, label: 'سعر البيع', color: 'text-primary' },
    { icon: Box, value: totalStock, label: 'المخزون', color: totalStock <= (product.min_stock || 0) ? 'text-destructive' : 'text-success' },
    { icon: Layers, value: variants.length, label: 'المتغيرات', color: 'text-info' },
  ];

  const variantCards: DetailItemData[] = variants.map(v => ({
    id: v.id,
    title: v.name,
    subtitle: v.sku || undefined,
    value: Number(v.additional_price) > 0 ? `+${Number(v.additional_price).toLocaleString()} ج.م` : '-',
    badge: <Badge variant={v.is_active ? "default" : "secondary"} className="text-[10px]">{v.is_active ? "نشط" : "غير نشط"}</Badge>,
  }));

  const stockCards: DetailItemData[] = (stockData as ProductStock[]).map(s => ({
    id: s.id,
    title: s.warehouses?.name || 'مستودع غير محدد',
    value: `${s.quantity} وحدة`,
  }));

  return (
    <div className="space-y-6 animate-fade-in">
      <MobileDetailHeader
        title={product.name}
        backTo="/products"
        action={
          <Button variant="outline" size="sm" className="min-h-11 min-w-11" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4" />
          </Button>
        }
      />

      {/* Header — hidden on mobile (MobileDetailHeader replaces it) */}
      {!isMobile && (
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/products')}>
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{product.name}</h1>
              {product.sku && <code className="text-sm bg-muted px-2 py-1 rounded">{product.sku}</code>}
              <Badge variant={product.is_active ? "default" : "secondary"}>{product.is_active ? "نشط" : "غير نشط"}</Badge>
            </div>
            {category && <p className="text-muted-foreground">{category.name}</p>}
          </div>
          <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
            <Edit className="h-4 w-4 ml-2" />تعديل
          </Button>
        </div>
      )}

      {/* Stats */}
      {isMobile ? (
        <MobileStatsScroll stats={mobileStats} />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardContent className="p-4">
              {product.image_url ? (
                <img src={product.image_url} alt={product.name} className="w-full aspect-square object-cover rounded-lg" />
              ) : (
                <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                  <Package className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
            </CardContent>
          </Card>
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle>معلومات المنتج</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div><p className="text-sm text-muted-foreground">سعر التكلفة</p><p className="text-lg font-bold">{Number(product.cost_price).toLocaleString()} ج.م</p></div>
                <div><p className="text-sm text-muted-foreground">سعر البيع</p><p className="text-lg font-bold text-primary">{Number(product.selling_price).toLocaleString()} ج.م</p></div>
                <div><p className="text-sm text-muted-foreground">هامش الربح</p><p className="text-lg font-bold text-success">{(Number(product.selling_price) - Number(product.cost_price)).toLocaleString()} ج.م</p></div>
                <div><p className="text-sm text-muted-foreground">المخزون الكلي</p><p className="text-lg font-bold">{totalStock}</p></div>
                <div><p className="text-sm text-muted-foreground">الحد الأدنى</p><p className="text-lg font-bold">{product.min_stock || 0}</p></div>
                <div><p className="text-sm text-muted-foreground">المتغيرات</p><p className="text-lg font-bold">{variants.length}</p></div>
              </div>
              {product.description && <div className="mt-4 p-3 bg-muted rounded-lg"><p className="text-sm">{product.description}</p></div>}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Context-Aware: Low Stock Alert + Actions */}
      {product && isLowStock && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>تنبيه: مخزون منخفض</AlertTitle>
          <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center gap-2 mt-1">
            <span>المخزون الحالي ({totalStock}) أقل من الحد الأدنى ({product.min_stock || 0})</span>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="min-h-9" onClick={() => setStockMovementOpen(true)}>
                <Plus className="h-3.5 w-3.5 ml-1" />إضافة مخزون
              </Button>
              <Button size="sm" variant="outline" className="min-h-9" onClick={() => navigate('/purchase-orders', { state: { prefillProductId: id } })}>
                <ShoppingCart className="h-3.5 w-3.5 ml-1" />أمر شراء
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Context Actions: Desktop quick actions bar */}
      {!isMobile && product && (
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setStockMovementOpen(true)}>
            <Plus className="h-4 w-4 ml-2" />إضافة للمخزون
          </Button>
          <Button size="sm" variant="outline" onClick={() => navigate('/purchase-orders', { state: { prefillProductId: id } })}>
            <ShoppingCart className="h-4 w-4 ml-2" />إنشاء أمر شراء
          </Button>
        </div>
      )}

      {/* Mobile: Collapsible Sections */}
      {isMobile && (
        <div className="space-y-3 mt-4">
          <MobileDetailSection title="متغيرات المنتج" priority="medium" icon={<Layers className="h-4 w-4" />} badge={variants.length}>
            <MobileDetailItems items={variantCards} emptyIcon={<Layers className="h-12 w-12 text-muted-foreground/50" />} emptyMessage="لا توجد متغيرات" />
          </MobileDetailSection>
          <MobileDetailSection title="المخزون في المستودعات" priority="medium" icon={<Box className="h-4 w-4" />} badge={stockData.length}>
            <MobileDetailItems items={stockCards} emptyIcon={<Box className="h-12 w-12 text-muted-foreground/50" />} emptyMessage="لا يوجد مخزون مسجل" />
          </MobileDetailSection>
          <MobileDetailSection title="المرفقات" priority="low" icon={<Paperclip className="h-4 w-4" />}>
            <div className="space-y-3">
              <FileUpload entityType="product" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'product', id] })} />
              <AttachmentsList entityType="product" entityId={id!} />
            </div>
          </MobileDetailSection>
        </div>
      )}

      {/* Desktop: Tabs */}
      {!isMobile && (
      <Tabs defaultValue="variants" className="w-full">
        <ScrollArea className="w-full">
          <TabsList className="flex w-max h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="variants" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Layers className="h-3.5 w-3.5" />المتغيرات ({variants.length})</TabsTrigger>
            <TabsTrigger value="stock" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Box className="h-3.5 w-3.5" />المخزون ({stockData.length})</TabsTrigger>
            <TabsTrigger value="attachments" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Paperclip className="h-3.5 w-3.5" />الملفات</TabsTrigger>
          </TabsList>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>

        <TabsContent value="variants" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2"><Layers className="h-5 w-5" />متغيرات المنتج</CardTitle>
              <Button size="sm" onClick={() => { setSelectedVariant(null); setVariantDialogOpen(true); }}>
                <Plus className="h-4 w-4 ml-2" />إضافة متغير
              </Button>
            </CardHeader>
            <CardContent>
              {isMobile ? (
                <MobileDetailItems
                  items={variantCards}
                  emptyIcon={<Layers className="h-12 w-12 text-muted-foreground/50" />}
                  emptyMessage="لا توجد متغيرات"
                />
              ) : (
                variants.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">لا توجد متغيرات</p>
                ) : (
                  <div className="space-y-3">
                    {variants.map((variant) => (
                      <div key={variant.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{variant.name}</span>
                            {variant.sku && <code className="text-xs bg-muted px-2 py-1 rounded">{variant.sku}</code>}
                            <Badge variant={variant.is_active ? "default" : "secondary"}>{variant.is_active ? "نشط" : "غير نشط"}</Badge>
                          </div>
                          {Number(variant.additional_price) > 0 && <p className="text-sm text-muted-foreground">سعر إضافي: +{Number(variant.additional_price).toLocaleString()} ج.م</p>}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="icon" onClick={() => { setSelectedVariant(variant); setVariantDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteVariantMutation.mutate(variant.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Box className="h-5 w-5" />المخزون في المستودعات</CardTitle></CardHeader>
            <CardContent>
              {isMobile ? (
                <MobileDetailItems
                  items={stockCards}
                  emptyIcon={<Box className="h-12 w-12 text-muted-foreground/50" />}
                  emptyMessage="لا يوجد مخزون مسجل"
                />
              ) : (
                stockData.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">لا يوجد مخزون مسجل</p>
                ) : (
                  <div className="space-y-3">
                    {(stockData as ProductStock[]).map((stock) => (
                      <div key={stock.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <span className="font-medium">{stock.warehouses?.name || 'مستودع غير محدد'}</span>
                        <span className="text-lg font-bold">{stock.quantity} وحدة</span>
                      </div>
                    ))}
                  </div>
                )
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attachments" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5" />الملفات والمرفقات</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <FileUpload entityType="product" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'product', id] })} />
              <AttachmentsList entityType="product" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      )}

      <ProductFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} product={product} />
      <ProductVariantDialog open={variantDialogOpen} onOpenChange={setVariantDialogOpen} productId={id!} variant={selectedVariant} />
    </div>
  );
};

export default ProductDetailsPage;
