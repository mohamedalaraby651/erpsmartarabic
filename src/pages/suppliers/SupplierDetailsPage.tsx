import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Truck, 
  ClipboardList, 
  Paperclip,
  AlertTriangle,
  Info,
  CreditCard,
  Package,
  Star,
  Activity,
  ShoppingCart,
  Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { generatePDF, getCompanySettings } from "@/lib/pdfGenerator";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import SupplierProfileHeader from "@/components/suppliers/SupplierProfileHeader";
import SupplierStatsCards from "@/components/suppliers/SupplierStatsCards";
import SupplierPurchasesChart from "@/components/suppliers/SupplierPurchasesChart";
import SupplierInfoTab from "@/components/suppliers/SupplierInfoTab";
import SupplierPaymentsTab from "@/components/suppliers/SupplierPaymentsTab";
import SupplierProductsTab from "@/components/suppliers/SupplierProductsTab";
import SupplierRatingTab from "@/components/suppliers/SupplierRatingTab";
import SupplierActivityTab from "@/components/suppliers/SupplierActivityTab";
import SupplierFormDialog from "@/components/suppliers/SupplierFormDialog";
import SupplierPaymentDialog from "@/components/suppliers/SupplierPaymentDialog";
import SupplierFinancialSummary from "@/components/suppliers/SupplierFinancialSummary";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database['public']['Tables']['suppliers']['Row'];
type PurchaseOrder = Database['public']['Tables']['purchase_orders']['Row'];

const HIGH_BALANCE_THRESHOLD = 50000; // تنبيه عند الرصيد أكثر من 50 ألف

const SupplierDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isPrintingStatement, setIsPrintingStatement] = useState(false);

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
      return data as (Supplier & {
        supplier_type?: string | null;
        category?: string | null;
        bank_name?: string | null;
        bank_account?: string | null;
        iban?: string | null;
        rating?: number | null;
        website?: string | null;
      }) | null;
    },
    enabled: !!id,
  });

  const { data: purchaseOrders = [], isLoading: loadingOrders } = useQuery({
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

  // Update rating mutation
  const updateRatingMutation = useMutation({
    mutationFn: async (rating: number) => {
      const { error } = await supabase
        .from('suppliers')
        .update({ rating })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier', id] });
      toast({ title: "تم تحديث التقييم بنجاح" });
    },
    onError: (error) => {
      logErrorSafely('SupplierDetailsPage', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    },
  });

  // Calculate stats
  const totalOrders = purchaseOrders.length;
  const totalPurchases = purchaseOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const currentBalance = Number(supplier?.current_balance || 0);
  const averageOrderValue = totalOrders > 0 ? totalPurchases / totalOrders : 0;
  const lastOrderDate = purchaseOrders.length > 0 ? purchaseOrders[0].created_at : null;
  const hasHighBalance = currentBalance > HIGH_BALANCE_THRESHOLD;

  // Pending orders count
  const pendingOrders = purchaseOrders.filter(o => o.status === 'pending' || o.status === 'draft');

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

  const handleCreatePurchaseOrder = () => {
    navigate('/purchase-orders', { state: { prefillSupplierId: id } });
  };

  const handlePrintStatement = async () => {
    if (!supplier) return;
    
    setIsPrintingStatement(true);
    try {
      // Fetch supplier payments
      const { data: payments, error: paymentsError } = await supabase
        .from('supplier_payments')
        .select('*')
        .eq('supplier_id', id)
        .order('payment_date', { ascending: false });
      
      if (paymentsError) throw paymentsError;
      
      interface StatementItem {
        date: string;
        type: string;
        reference: string;
        debit: number;
        credit: number;
        status: string;
      }

      // Prepare statement data combining orders and payments
      const statementData: StatementItem[] = [];
      
      // Add purchase orders
      purchaseOrders.forEach(order => {
        statementData.push({
          date: order.created_at,
          type: 'أمر شراء',
          reference: order.order_number,
          debit: Number(order.total_amount),
          credit: 0,
          status: order.status === 'approved' ? 'معتمد' : order.status === 'pending' ? 'معلق' : order.status,
        });
      });
      
      interface SupplierPaymentRow {
        id: string;
        payment_date: string;
        payment_number: string;
        amount: number;
      }

      // Add payments
      (payments as SupplierPaymentRow[] || []).forEach((payment) => {
        statementData.push({
          date: payment.payment_date,
          type: 'دفعة',
          reference: payment.payment_number,
          debit: 0,
          credit: Number(payment.amount),
          status: 'مسدد',
        });
      });
      
      // Sort by date
      statementData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      // Calculate running balance
      let runningBalance = Number(supplier.current_balance || 0);
      const dataWithBalance = statementData.map(item => {
        const balance = runningBalance;
        runningBalance = runningBalance - item.debit + item.credit;
        return {
          ...item,
          date: new Date(item.date).toLocaleDateString('ar-EG'),
          debit: item.debit > 0 ? item.debit.toLocaleString() : '-',
          credit: item.credit > 0 ? item.credit.toLocaleString() : '-',
          balance: balance.toLocaleString(),
        };
      });
      
      // Generate PDF
      await generatePDF({
        title: `كشف حساب المورد: ${supplier.name}`,
        data: dataWithBalance,
        columns: [
          { key: 'date', label: 'التاريخ' },
          { key: 'type', label: 'النوع' },
          { key: 'reference', label: 'المرجع' },
          { key: 'debit', label: 'مدين' },
          { key: 'credit', label: 'دائن' },
          { key: 'balance', label: 'الرصيد' },
          { key: 'status', label: 'الحالة' },
        ],
        includeCompanyInfo: true,
        includeLogo: true,
        orientation: 'landscape',
      });
      
      toast({ title: "تم تصدير كشف الحساب بنجاح" });
    } catch (error) {
      logErrorSafely('SupplierDetailsPage', error);
      toast({ 
        title: "حدث خطأ", 
        description: getSafeErrorMessage(error), 
        variant: "destructive" 
      });
    } finally {
      setIsPrintingStatement(false);
    }
  };

  if (loadingSupplier) {
    return <DetailPageSkeleton variant="default" tabCount={5} />;
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
      {/* Back Button */}
      <Button variant="ghost" onClick={() => navigate('/suppliers')} className="mb-2">
        <ArrowRight className="h-4 w-4 ml-2" />
        العودة للموردين
      </Button>

      {/* Hero Header */}
      <SupplierProfileHeader
        supplier={supplier}
        onEdit={() => setEditDialogOpen(true)}
        onCreatePurchaseOrder={handleCreatePurchaseOrder}
        onRecordPayment={() => setPaymentDialogOpen(true)}
        onPrintStatement={handlePrintStatement}
        isPrintingStatement={isPrintingStatement}
      />

      {/* Alerts */}
      <div className="space-y-3">
        {hasHighBalance && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>تنبيه: رصيد مرتفع</AlertTitle>
            <AlertDescription>
              الرصيد الحالي للمورد ({currentBalance.toLocaleString()} ج.م) يتجاوز الحد المسموح به.
            </AlertDescription>
          </Alert>
        )}
        
        {pendingOrders.length > 0 && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>طلبات معلقة</AlertTitle>
            <AlertDescription>
              يوجد {pendingOrders.length} أمر شراء في انتظار المراجعة أو الاعتماد.
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Stats Cards */}
      <SupplierStatsCards
        totalOrders={totalOrders}
        totalPurchases={totalPurchases}
        currentBalance={currentBalance}
        averageOrderValue={averageOrderValue}
        lastOrderDate={lastOrderDate}
        hasHighBalance={hasHighBalance}
      />

      {/* Chart */}
      <SupplierPurchasesChart purchaseOrders={purchaseOrders} />

      {/* Tabs */}
      <Tabs defaultValue="info" className="mt-6">
        <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
          <TabsTrigger value="info" className="gap-2">
            <Info className="h-4 w-4" />
            معلومات المورد
          </TabsTrigger>
          <TabsTrigger value="financial" className="gap-2">
            <CreditCard className="h-4 w-4" />
            الملخص المالي
          </TabsTrigger>
          <TabsTrigger value="orders" className="gap-2">
            <ShoppingCart className="h-4 w-4" />
            أوامر الشراء ({totalOrders})
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <CreditCard className="h-4 w-4" />
            المدفوعات
          </TabsTrigger>
          <TabsTrigger value="products" className="gap-2">
            <Package className="h-4 w-4" />
            المنتجات
          </TabsTrigger>
          <TabsTrigger value="rating" className="gap-2">
            <Star className="h-4 w-4" />
            التقييم
          </TabsTrigger>
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="h-4 w-4" />
            النشاطات
          </TabsTrigger>
          <TabsTrigger value="attachments" className="gap-2">
            <Paperclip className="h-4 w-4" />
            المرفقات
          </TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="mt-6">
          <SupplierInfoTab supplier={supplier} />
        </TabsContent>

        <TabsContent value="financial" className="mt-6">
          <SupplierFinancialSummary
            totalPurchases={totalPurchases}
            totalPayments={totalPurchases - currentBalance}
            currentBalance={currentBalance}
            creditLimit={(supplier as any).credit_limit || 0}
            paymentTermsDays={(supplier as any).payment_terms_days || 0}
            discountPercentage={(supplier as any).discount_percentage || 0}
          />
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="orders" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>أوامر الشراء</CardTitle>
                <CardDescription>سجل أوامر الشراء من هذا المورد</CardDescription>
              </div>
              <Button onClick={handleCreatePurchaseOrder} size="sm" className="gap-2">
                <ShoppingCart className="h-4 w-4" />
                أمر شراء جديد
              </Button>
            </CardHeader>
            <CardContent>
              {loadingOrders ? (
                <p className="text-muted-foreground text-center py-8">جاري التحميل...</p>
              ) : purchaseOrders.length > 0 ? (
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
                      <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50">
                        <TableCell className="font-medium font-mono">
                          {order.order_number}
                        </TableCell>
                        <TableCell>
                          {new Date(order.created_at).toLocaleDateString('ar-EG')}
                        </TableCell>
                        <TableCell className="font-bold">
                          {Number(order.total_amount).toLocaleString()} ج.م
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <ClipboardList className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-muted-foreground">لا توجد أوامر شراء</p>
                  <Button onClick={handleCreatePurchaseOrder} variant="outline" size="sm" className="mt-4">
                    إنشاء أول أمر شراء
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6">
          <SupplierPaymentsTab 
            supplierId={id!} 
            onAddPayment={() => setPaymentDialogOpen(true)} 
          />
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="mt-6">
          <SupplierProductsTab supplierId={id!} />
        </TabsContent>

        {/* Rating Tab */}
        <TabsContent value="rating" className="mt-6">
          <SupplierRatingTab
            supplierId={id!}
            currentRating={supplier.rating || 0}
            onRatingChange={(rating) => updateRatingMutation.mutate(rating)}
          />
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="mt-6">
          <SupplierActivityTab supplierId={id!} />
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
                entityType="supplier"
                entityId={id!}
                onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'supplier', id] })}
              />
              <AttachmentsList entityType="supplier" entityId={id!} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <SupplierFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        supplier={supplier}
      />

      <SupplierPaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        supplier={supplier}
      />
    </div>
  );
};

export default SupplierDetailsPage;
