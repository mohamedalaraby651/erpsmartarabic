import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  ArrowRight, Truck, ClipboardList, Paperclip, Info,
  CreditCard, Package, Star, Activity, ShoppingCart, BarChart3,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { generatePDF } from "@/lib/pdfGenerator";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { MobileDetailHeader } from "@/components/mobile/MobileDetailHeader";
import { MobileStatsScroll } from "@/components/shared/MobileStatsScroll";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileDetailSection from "@/components/mobile/MobileDetailSection";
import { ChartErrorBoundary } from "@/components/shared/ChartErrorBoundary";
import { ServerPagination } from "@/components/shared/ServerPagination";

import SupplierHeroHeader from "@/components/suppliers/hero/SupplierHeroHeader";
import SupplierAlertsBanner from "@/components/suppliers/alerts/SupplierAlertsBanner";
import SupplierPurchasesChartRPC from "@/components/suppliers/charts/SupplierPurchasesChartRPC";
import { SupplierAgingChart } from "@/components/suppliers/charts/SupplierAgingChart";
import { SupplierCashFlowChart } from "@/components/suppliers/charts/SupplierCashFlowChart";
import SupplierInfoTab from "@/components/suppliers/SupplierInfoTab";
import SupplierFinancialSummary from "@/components/suppliers/SupplierFinancialSummary";
import SupplierPaymentsTab from "@/components/suppliers/SupplierPaymentsTab";
import SupplierProductsTab from "@/components/suppliers/SupplierProductsTab";
import SupplierRatingTab from "@/components/suppliers/SupplierRatingTab";
import SupplierActivityTab from "@/components/suppliers/SupplierActivityTab";
import SupplierFormDialog from "@/components/suppliers/SupplierFormDialog";
import SupplierPaymentDialog from "@/components/suppliers/SupplierPaymentDialog";

import { useSupplierDetail, useSupplierNavigation } from "@/hooks/suppliers";

const SupplierDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isPrintingStatement, setIsPrintingStatement] = useState(false);

  const detail = useSupplierDetail(id);
  const nav = useSupplierNavigation(id);

  const {
    supplier, isLoading, chartData,
    activeTab, setActiveTab, updateRatingMutation,
    totalPurchases, totalPayments, totalOutstanding, orderCount,
    pendingOrderCount, avgOrderValue, paymentRatio, dso,
    currentBalance, creditLimit, hasHighBalance, lastOrderDate,
    paginatedOrders, orderPage, orderPageSize, goToOrderPage,
    paginatedPayments, paymentPage, paymentPageSize, goToPaymentPage,
  } = detail;

  const handleCreatePurchaseOrder = () => navigate('/purchase-orders', { state: { prefillSupplierId: id } });

  const handlePrintStatement = async () => {
    if (!supplier) return;
    setIsPrintingStatement(true);
    try {
      const { data, error } = await supabase.rpc('get_supplier_statement', { _supplier_id: id! });
      if (error) throw error;
      const entries = (data || []) as Array<{ entry_date: string; entry_type: string; reference: string; debit: number; credit: number; running_balance: number; status: string }>;
      const formatted = entries.map(e => ({
        date: new Date(e.entry_date).toLocaleDateString('ar-EG'),
        type: e.entry_type,
        reference: e.reference,
        debit: e.debit > 0 ? e.debit.toLocaleString() : '-',
        credit: e.credit > 0 ? e.credit.toLocaleString() : '-',
        balance: e.running_balance.toLocaleString(),
        status: e.status,
      }));
      await generatePDF({
        title: `كشف حساب المورد: ${supplier.name}`,
        data: formatted,
        columns: [
          { key: 'date', label: 'التاريخ' }, { key: 'type', label: 'النوع' },
          { key: 'reference', label: 'المرجع' }, { key: 'debit', label: 'مدين' },
          { key: 'credit', label: 'دائن' }, { key: 'balance', label: 'الرصيد' },
          { key: 'status', label: 'الحالة' },
        ],
        includeCompanyInfo: true, includeLogo: true, orientation: 'landscape',
      });
      toast({ title: "تم تصدير كشف الحساب بنجاح" });
    } catch (error) {
      logErrorSafely('SupplierDetailsPage', error);
      toast({ title: "حدث خطأ", description: getSafeErrorMessage(error), variant: "destructive" });
    } finally {
      setIsPrintingStatement(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      draft: { label: 'مسودة', variant: 'secondary' }, pending: { label: 'معلق', variant: 'outline' },
      approved: { label: 'معتمد', variant: 'default' }, completed: { label: 'مكتمل', variant: 'default' },
      cancelled: { label: 'ملغي', variant: 'destructive' },
    };
    const s = statusMap[status] || { label: status, variant: 'secondary' as const };
    return <Badge variant={s.variant}>{s.label}</Badge>;
  };

  if (isLoading) return <DetailPageSkeleton variant="default" tabCount={5} />;
  if (!supplier) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Truck className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <p className="text-muted-foreground mb-4">لم يتم العثور على المورد</p>
        <Button onClick={() => navigate('/suppliers')}><ArrowRight className="h-4 w-4 ml-2" />العودة للموردين</Button>
      </div>
    );
  }

  const mobileStats = [
    { icon: ShoppingCart, value: orderCount, label: 'الطلبات', color: 'text-primary' },
    { icon: Package, value: `${totalPurchases.toLocaleString()}`, label: 'المشتريات', color: 'text-info' },
    { icon: CreditCard, value: `${currentBalance.toLocaleString()}`, label: 'الرصيد', color: hasHighBalance ? 'text-destructive' : 'text-success' },
  ];

  // Paginated data
  const ordersData = paginatedOrders?.data || [];
  const ordersCount = paginatedOrders?.count || 0;
  const ordersTotalPages = Math.ceil(ordersCount / orderPageSize);

  const paymentsData = paginatedPayments?.data || [];
  const paymentsCount = paginatedPayments?.count || 0;

  return (
    <div className="space-y-6">
      <MobileDetailHeader title={supplier.name} backTo="/suppliers" action={<Button variant="outline" size="sm" className="min-h-11 min-w-11" onClick={() => setEditDialogOpen(true)}>تعديل</Button>} />
      {!isMobile && <Button variant="ghost" onClick={() => navigate('/suppliers')} className="mb-2"><ArrowRight className="h-4 w-4 ml-2" />العودة للموردين</Button>}

      <SupplierHeroHeader
        supplier={supplier}
        onEdit={() => setEditDialogOpen(true)}
        onCreatePurchaseOrder={handleCreatePurchaseOrder}
        onRecordPayment={() => setPaymentDialogOpen(true)}
        onPrintStatement={handlePrintStatement}
        isPrintingStatement={isPrintingStatement}
        totalPurchases={totalPurchases}
        totalPayments={totalPayments}
        totalOutstanding={totalOutstanding}
        orderCount={orderCount}
        onPrev={nav.goPrev}
        onNext={nav.goNext}
        hasPrev={!!nav.prevId}
        hasNext={!!nav.nextId}
      />

      <SupplierAlertsBanner
        currentBalance={currentBalance}
        creditLimit={creditLimit}
        pendingOrderCount={pendingOrderCount}
        lastOrderDate={lastOrderDate}
      />

      {isMobile ? (
        <div className="space-y-3 mt-4">
          <MobileStatsScroll stats={mobileStats} />
          <MobileDetailSection title="معلومات المورد" priority="medium" icon={<Info className="h-4 w-4" />}>
            <SupplierInfoTab supplier={supplier} />
          </MobileDetailSection>
          <MobileDetailSection title="الملخص المالي" priority="medium" icon={<CreditCard className="h-4 w-4" />}>
            <SupplierFinancialSummary totalPurchases={totalPurchases} totalPayments={totalPayments} currentBalance={currentBalance} creditLimit={creditLimit} paymentTermsDays={supplier.payment_terms_days || 0} discountPercentage={supplier.discount_percentage || 0} dso={dso} paymentRatio={paymentRatio} />
          </MobileDetailSection>
          <MobileDetailSection title="المدفوعات" priority="medium" icon={<CreditCard className="h-4 w-4" />}>
            <SupplierPaymentsTab supplierId={id!} onAddPayment={() => setPaymentDialogOpen(true)} payments={paymentsData} totalCount={paymentsCount} currentPage={paymentPage} pageSize={paymentPageSize} onPageChange={goToPaymentPage} />
          </MobileDetailSection>
          <MobileDetailSection title="المنتجات" priority="low" icon={<Package className="h-4 w-4" />}>
            <SupplierProductsTab supplierId={id!} />
          </MobileDetailSection>
          <MobileDetailSection title="التقييم" priority="low" icon={<Star className="h-4 w-4" />}>
            <SupplierRatingTab supplierId={id!} currentRating={(supplier as any).rating || 0} onRatingChange={(r) => updateRatingMutation.mutate(r)} />
          </MobileDetailSection>
          <MobileDetailSection title="النشاطات" priority="low" icon={<Activity className="h-4 w-4" />}>
            <SupplierActivityTab supplierId={id!} />
          </MobileDetailSection>
          <MobileDetailSection title="المرفقات" priority="low" icon={<Paperclip className="h-4 w-4" />}>
            <FileUpload entityType="supplier" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'supplier', id] })} />
            <AttachmentsList entityType="supplier" entityId={id!} />
          </MobileDetailSection>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
          <ScrollArea className="w-full">
            <TabsList className="flex w-max h-auto gap-1 bg-muted/50 p-1">
              <TabsTrigger value="info" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Info className="h-3.5 w-3.5" />معلومات المورد</TabsTrigger>
              <TabsTrigger value="financial" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><CreditCard className="h-3.5 w-3.5" />الملخص المالي</TabsTrigger>
              <TabsTrigger value="orders" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><ShoppingCart className="h-3.5 w-3.5" />أوامر الشراء ({ordersCount})</TabsTrigger>
              <TabsTrigger value="payments" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><CreditCard className="h-3.5 w-3.5" />المدفوعات</TabsTrigger>
              <TabsTrigger value="analytics" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><BarChart3 className="h-3.5 w-3.5" />التحليلات</TabsTrigger>
              <TabsTrigger value="products" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Package className="h-3.5 w-3.5" />المنتجات</TabsTrigger>
              <TabsTrigger value="rating" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Star className="h-3.5 w-3.5" />التقييم</TabsTrigger>
              <TabsTrigger value="activity" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Activity className="h-3.5 w-3.5" />النشاطات</TabsTrigger>
              <TabsTrigger value="attachments" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Paperclip className="h-3.5 w-3.5" />المرفقات</TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="info" className="mt-6">
            <ChartErrorBoundary title="معلومات المورد"><SupplierInfoTab supplier={supplier} /></ChartErrorBoundary>
          </TabsContent>

          <TabsContent value="financial" className="mt-6">
            <ChartErrorBoundary title="الملخص المالي">
              <SupplierFinancialSummary totalPurchases={totalPurchases} totalPayments={totalPayments} currentBalance={currentBalance} creditLimit={creditLimit} paymentTermsDays={supplier.payment_terms_days || 0} discountPercentage={supplier.discount_percentage || 0} dso={dso} paymentRatio={paymentRatio} />
            </ChartErrorBoundary>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <ChartErrorBoundary title="أوامر الشراء">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div><CardTitle>أوامر الشراء</CardTitle><CardDescription>سجل أوامر الشراء من هذا المورد</CardDescription></div>
                  <Button onClick={handleCreatePurchaseOrder} size="sm" className="gap-2"><ShoppingCart className="h-4 w-4" />أمر شراء جديد</Button>
                </CardHeader>
                <CardContent>
                  {ordersData.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader><TableRow><TableHead>رقم الأمر</TableHead><TableHead>التاريخ</TableHead><TableHead>المبلغ</TableHead><TableHead>الحالة</TableHead></TableRow></TableHeader>
                        <TableBody>
                          {ordersData.map(order => (
                            <TableRow key={order.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/purchase-orders/${order.id}`)}>
                              <TableCell className="font-medium font-mono">{order.order_number}</TableCell>
                              <TableCell>{new Date(order.created_at).toLocaleDateString('ar-EG')}</TableCell>
                              <TableCell className="font-bold">{Number(order.total_amount).toLocaleString()} ج.م</TableCell>
                              <TableCell>{getStatusBadge(order.status)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-4">
                        <ServerPagination currentPage={orderPage} totalPages={ordersTotalPages} totalCount={ordersCount} pageSize={orderPageSize} onPageChange={goToOrderPage} hasNextPage={orderPage < ordersTotalPages} hasPrevPage={orderPage > 1} />
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8"><ClipboardList className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" /><p className="text-muted-foreground">لا توجد أوامر شراء</p></div>
                  )}
                </CardContent>
              </Card>
            </ChartErrorBoundary>
          </TabsContent>

          <TabsContent value="payments" className="mt-6">
            <ChartErrorBoundary title="المدفوعات">
              <SupplierPaymentsTab supplierId={id!} onAddPayment={() => setPaymentDialogOpen(true)} payments={paymentsData} totalCount={paymentsCount} currentPage={paymentPage} pageSize={paymentPageSize} onPageChange={goToPaymentPage} />
            </ChartErrorBoundary>
          </TabsContent>

          <TabsContent value="analytics" className="mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <ChartErrorBoundary title="المشتريات الشهرية">
                <SupplierPurchasesChartRPC chartData={chartData} />
              </ChartErrorBoundary>
              <ChartErrorBoundary title="توزيع أعمار المستحقات">
                <SupplierAgingChart supplierId={id!} />
              </ChartErrorBoundary>
              <ChartErrorBoundary title="التدفق المالي التراكمي">
                <SupplierCashFlowChart monthlyData={chartData?.monthly_data} />
              </ChartErrorBoundary>
            </div>
          </TabsContent>

          <TabsContent value="products" className="mt-6">
            <ChartErrorBoundary title="المنتجات"><SupplierProductsTab supplierId={id!} /></ChartErrorBoundary>
          </TabsContent>

          <TabsContent value="rating" className="mt-6">
            <ChartErrorBoundary title="التقييم"><SupplierRatingTab supplierId={id!} currentRating={(supplier as any).rating || 0} onRatingChange={(r) => updateRatingMutation.mutate(r)} /></ChartErrorBoundary>
          </TabsContent>

          <TabsContent value="activity" className="mt-6">
            <ChartErrorBoundary title="النشاطات"><SupplierActivityTab supplierId={id!} /></ChartErrorBoundary>
          </TabsContent>

          <TabsContent value="attachments" className="mt-6">
            <ChartErrorBoundary title="المرفقات">
              <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Paperclip className="h-5 w-5" />المستندات والمرفقات</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <FileUpload entityType="supplier" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'supplier', id] })} />
                  <AttachmentsList entityType="supplier" entityId={id!} />
                </CardContent>
              </Card>
            </ChartErrorBoundary>
          </TabsContent>
        </Tabs>
      )}

      <SupplierFormDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} supplier={supplier} />
      <SupplierPaymentDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen} supplier={supplier} />
    </div>
  );
};

// Wrap with error boundary
import { ChartErrorBoundary as PageErrorBoundary } from "@/components/shared/ChartErrorBoundary";
const SupplierDetailsPageWithErrorBoundary = () => (
  <PageErrorBoundary title="تفاصيل المورد"><SupplierDetailsPage /></PageErrorBoundary>
);

export default SupplierDetailsPageWithErrorBoundary;
