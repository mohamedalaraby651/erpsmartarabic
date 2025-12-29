import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowRight, Truck, Phone, Mail, MapPin, CreditCard, ClipboardList, User, Paperclip } from "lucide-react";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];

const SupplierDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: supplier, isLoading: loadingSupplier } = useQuery({
    queryKey: ['supplier', id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from('suppliers')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw error;
      return data as Supplier | null;
    },
    enabled: !!id,
  });

  const { data: purchaseOrders, isLoading: loadingOrders } = useQuery({
    queryKey: ['supplier-purchase-orders', id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from('purchase_orders')
        .select('*')
        .eq('supplier_id', id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as PurchaseOrder[];
    },
    enabled: !!id,
  });

  const totalOrders = purchaseOrders?.length || 0;
  const totalAmount = purchaseOrders?.reduce((sum, o) => sum + (o.total_amount || 0), 0) || 0;

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'مسودة', variant: 'secondary' },
      pending: { label: 'معلق', variant: 'outline' },
      approved: { label: 'معتمد', variant: 'default' },
      completed: { label: 'مكتمل', variant: 'default' },
      cancelled: { label: 'ملغي', variant: 'destructive' },
    };
    const s = statusMap[status] || { label: status, variant: 'secondary' };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (loadingSupplier) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="text-muted-foreground">جاري التحميل...</span>
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">لم يتم العثور على المورد</p>
        <Button onClick={() => navigate('/suppliers')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة للموردين
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/suppliers')}>
          <ArrowRight className="h-4 w-4 ml-2" />
          العودة
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{supplier.name}</h1>
          <p className="text-muted-foreground">تفاصيل المورد</p>
        </div>
        <Badge variant={supplier.is_active ? 'default' : 'secondary'} className="mr-auto">
          {supplier.is_active ? 'نشط' : 'غير نشط'}
        </Badge>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOrders}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">إجمالي المشتريات</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAmount.toLocaleString()} ج.م</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">الرصيد الحالي</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {(supplier.current_balance || 0).toLocaleString()} ج.م
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="info">
        <TabsList>
          <TabsTrigger value="info">معلومات المورد</TabsTrigger>
          <TabsTrigger value="orders">أوامر الشراء ({totalOrders})</TabsTrigger>
          <TabsTrigger value="attachments">المرفقات</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>بيانات المورد</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  {supplier.contact_person && (
                    <div className="flex items-center gap-3">
                      <User className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">جهة الاتصال</p>
                        <p className="font-medium">{supplier.contact_person}</p>
                      </div>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">الهاتف</p>
                        <p className="font-medium">{supplier.phone}</p>
                        {supplier.phone2 && <p className="text-sm">{supplier.phone2}</p>}
                      </div>
                    </div>
                  )}
                  {supplier.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">البريد الإلكتروني</p>
                        <p className="font-medium">{supplier.email}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {supplier.address && (
                    <div className="flex items-center gap-3">
                      <MapPin className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">العنوان</p>
                        <p className="font-medium">{supplier.address}</p>
                      </div>
                    </div>
                  )}
                  {supplier.tax_number && (
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">الرقم الضريبي</p>
                        <p className="font-medium">{supplier.tax_number}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {supplier.notes && (
                <div className="pt-4 border-t">
                  <p className="text-sm text-muted-foreground mb-1">ملاحظات</p>
                  <p>{supplier.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>أوامر الشراء</CardTitle>
              <CardDescription>سجل أوامر الشراء من هذا المورد</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <p className="text-muted-foreground text-center py-8">جاري التحميل...</p>
              ) : purchaseOrders && purchaseOrders.length > 0 ? (
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
                    {purchaseOrders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_number}</TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString('ar-EG')}
                        </TableCell>
                        <TableCell>{order.total_amount.toLocaleString()} ج.م</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد أوامر شراء</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

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
                entityType="supplier"
                entityId={id!}
                onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'supplier', id] })}
              />
              <AttachmentsList entityType="supplier" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SupplierDetailsPage;
