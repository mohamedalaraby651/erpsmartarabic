import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  FileText,
  Printer,
  Edit,
  Package,
  Activity,
  Paperclip,
  User,
  Calendar,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
  Clock,
  Copy,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { EntityLink } from "@/components/shared/EntityLink";
import QuotationFormDialog from "@/components/quotations/QuotationFormDialog";
import { QuotationPrintView } from "@/components/print/QuotationPrintView";
import type { Database } from "@/integrations/supabase/types";

type Quotation = Database['public']['Tables']['quotations']['Row'];
type Customer = Database['public']['Tables']['customers']['Row'];

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  pending: 'معلق',
  approved: 'معتمد',
  rejected: 'مرفوض',
  cancelled: 'ملغي',
};

const statusColors: Record<string, string> = {
  draft: 'bg-muted text-muted-foreground',
  pending: 'bg-warning/10 text-warning border-warning/20',
  approved: 'bg-success/10 text-success border-success/20',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  cancelled: 'bg-muted text-muted-foreground',
};

const QuotationDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  // Fetch quotation with customer
  const { data: quotation, isLoading } = useQuery({
    queryKey: ['quotation', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('quotations')
        .select('*, customers(*)')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as (Quotation & { customers: Customer | null }) | null;
    },
    enabled: !!id,
  });

  // Fetch quotation items
  const { data: quotationItems = [] } = useQuery({
    queryKey: ['quotation-items', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('quotation_items')
        .select('*, products(id, name, sku), product_variants(id, name)')
        .eq('quotation_id', id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch related sales orders
  const { data: salesOrders = [] } = useQuery({
    queryKey: ['quotation-sales-orders', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('sales_orders')
        .select('*')
        .eq('quotation_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Fetch activity logs
  const { data: activities = [] } = useQuery({
    queryKey: ['quotation-activities', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('entity_type', 'quotation')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const handleCreateSalesOrder = () => {
    navigate('/sales-orders', { state: { prefillQuotationId: id } });
  };

  const handleDuplicateQuotation = () => {
    toast({ title: "جاري نسخ عرض السعر...", description: "سيتم فتح نموذج عرض سعر جديد" });
    // TODO: Implement duplication
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted-foreground">جاري التحميل...</span>
      </div>
    );
  }

  if (!quotation) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">لم يتم العثور على عرض السعر</p>
        <Button onClick={() => navigate('/quotations')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة لعروض الأسعار
        </Button>
      </div>
    );
  }

  const totalAmount = Number(quotation.total_amount || 0);
  const isExpired = quotation.valid_until && new Date(quotation.valid_until) < new Date();
  const daysUntilExpiry = quotation.valid_until 
    ? Math.ceil((new Date(quotation.valid_until).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/quotations')} className="mb-2">
        <ArrowRight className="h-4 w-4 ml-2" />
        العودة لعروض الأسعار
      </Button>

      {/* Hero Header */}
      <Card className="overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/5 via-background to-primary/10">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Quotation Info */}
            <div className="flex items-start gap-4">
              <div className="p-4 rounded-2xl bg-primary/10">
                <FileText className="h-10 w-10 text-primary" />
              </div>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-2xl font-bold font-mono">{quotation.quotation_number}</h1>
                  <Badge className={statusColors[quotation.status]}>
                    {statusLabels[quotation.status]}
                  </Badge>
                  {isExpired && (
                    <Badge variant="destructive">منتهي الصلاحية</Badge>
                  )}
                </div>
                {quotation.customers && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <User className="h-4 w-4" />
                    <EntityLink type="customer" id={quotation.customers.id}>
                      {quotation.customers.name}
                    </EntityLink>
                  </div>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {new Date(quotation.created_at).toLocaleDateString('ar-EG')}
                  </span>
                  {quotation.valid_until && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      صالح حتى: {new Date(quotation.valid_until).toLocaleDateString('ar-EG')}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)}>
                <Printer className="h-4 w-4 ml-2" />
                طباعة
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 ml-2" />
                تعديل
              </Button>
              <Button variant="outline" size="sm" onClick={handleDuplicateQuotation}>
                <Copy className="h-4 w-4 ml-2" />
                نسخ
              </Button>
              {quotation.status === 'approved' && !isExpired && (
                <Button size="sm" onClick={handleCreateSalesOrder}>
                  <ShoppingCart className="h-4 w-4 ml-2" />
                  تحويل لأمر بيع
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {isExpired && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>عرض سعر منتهي الصلاحية</AlertTitle>
          <AlertDescription>
            انتهت صلاحية هذا العرض. يمكنك نسخه وإنشاء عرض جديد.
          </AlertDescription>
        </Alert>
      )}

      {!isExpired && daysUntilExpiry !== null && daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>قرب انتهاء الصلاحية</AlertTitle>
          <AlertDescription>
            ستنتهي صلاحية هذا العرض خلال {daysUntilExpiry} {daysUntilExpiry === 1 ? 'يوم' : 'أيام'}.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalAmount.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">إجمالي العرض</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-info/10">
                <Package className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quotationItems.length}</p>
                <p className="text-sm text-muted-foreground">عدد البنود</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <ShoppingCart className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold">{salesOrders.length}</p>
                <p className="text-sm text-muted-foreground">أوامر البيع</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${isExpired ? 'bg-destructive/10' : 'bg-warning/10'}`}>
                <Clock className={`h-5 w-5 ${isExpired ? 'text-destructive' : 'text-warning'}`} />
              </div>
              <div>
                <p className="text-sm font-medium">
                  {isExpired ? 'منتهي' : daysUntilExpiry !== null ? `${daysUntilExpiry} يوم` : 'غير محدد'}
                </p>
                <p className="text-sm text-muted-foreground">الصلاحية</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items" className="mt-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="items" className="gap-2">
            <Package className="h-4 w-4" />
            بنود العرض ({quotationItems.length})
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            أوامر البيع ({salesOrders.length})
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            سجل النشاط
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2">
            <Paperclip className="h-4 w-4" />
            المرفقات
          </TabsTrigger>
        </TabsList>

        {/* Items Tab */}
        <TabsContent value="items" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>بنود العرض</CardTitle>
              <CardDescription>تفاصيل المنتجات في هذا العرض</CardDescription>
            </CardHeader>
            <CardContent>
              {quotationItems.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>المنتج</TableHead>
                      <TableHead>الكمية</TableHead>
                      <TableHead>سعر الوحدة</TableHead>
                      <TableHead>الخصم</TableHead>
                      <TableHead>الإجمالي</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quotationItems.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <EntityLink type="product" id={item.products?.id}>
                              {item.products?.name || 'منتج محذوف'}
                            </EntityLink>
                            {item.product_variants && (
                              <span className="text-xs text-muted-foreground">
                                {item.product_variants.name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{item.quantity}</TableCell>
                        <TableCell>{Number(item.unit_price).toLocaleString()} ج.م</TableCell>
                        <TableCell>{Number(item.discount_percentage || 0)}%</TableCell>
                        <TableCell className="font-bold">
                          {Number(item.total_price).toLocaleString()} ج.م
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد بنود في هذا العرض</p>
                </div>
              )}

              {/* Summary */}
              <div className="mt-6 p-4 rounded-lg bg-muted/50">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>المجموع الفرعي</span>
                    <span>{Number(quotation.subtotal).toLocaleString()} ج.م</span>
                  </div>
                  {Number(quotation.discount_amount) > 0 && (
                    <div className="flex justify-between text-success">
                      <span>الخصم</span>
                      <span>-{Number(quotation.discount_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  {Number(quotation.tax_amount) > 0 && (
                    <div className="flex justify-between">
                      <span>الضريبة</span>
                      <span>{Number(quotation.tax_amount).toLocaleString()} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-lg pt-2 border-t">
                    <span>الإجمالي</span>
                    <span>{totalAmount.toLocaleString()} ج.م</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Orders Tab */}
        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>أوامر البيع المرتبطة</CardTitle>
                <CardDescription>أوامر البيع المنشأة من هذا العرض</CardDescription>
              </div>
              {quotation.status === 'approved' && !isExpired && (
                <Button size="sm" onClick={handleCreateSalesOrder}>
                  <ShoppingCart className="h-4 w-4 ml-2" />
                  تحويل لأمر بيع
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {salesOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>رقم الأمر</TableHead>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>المبلغ</TableHead>
                      <TableHead>الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesOrders.map((order: any) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          <EntityLink type="sales-order" id={order.id}>
                            {order.order_number}
                          </EntityLink>
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString('ar-EG')}
                        </TableCell>
                        <TableCell className="font-bold">
                          {Number(order.total_amount).toLocaleString()} ج.م
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[order.status]}>
                            {statusLabels[order.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد أوامر بيع مرتبطة</p>
                  {quotation.status === 'approved' && !isExpired && (
                    <Button onClick={handleCreateSalesOrder} variant="outline" size="sm" className="mt-4">
                      تحويل لأمر بيع
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>سجل النشاط</CardTitle>
              <CardDescription>آخر الأحداث على هذا العرض</CardDescription>
            </CardHeader>
            <CardContent>
              {activities.length > 0 ? (
                <div className="space-y-4">
                  {activities.map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="p-2 rounded-full bg-primary/10">
                        <Activity className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{activity.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleString('ar-EG')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا يوجد سجل نشاط</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Attachments Tab */}
        <TabsContent value="attachments" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="h-5 w-5" />
                المستندات والمرفقات
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUpload
                entityType="quotation"
                entityId={id!}
                onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'quotation', id] })}
              />
              <AttachmentsList entityType="quotation" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <QuotationFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        quotation={quotation}
      />

      {id && (
        <QuotationPrintView
          quotationId={id}
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
        />
      )}
    </div>
  );
};

export default QuotationDetailsPage;
