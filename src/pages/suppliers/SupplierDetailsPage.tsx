import { useState, useCallback, useEffect, useRef, lazy, Suspense } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
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
  CreditCard, Package, Star, Activity, ShoppingCart, BarChart3, Printer,
  StickyNote, FileText, Clock, Loader2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";
import { generatePDF } from "@/lib/pdfGeneratorLazy";
import { supabase } from "@/integrations/supabase/client";
import { FileUpload } from "@/components/shared/FileUpload";
import { AttachmentsList } from "@/components/shared/AttachmentsList";
import { DetailPageSkeleton } from "@/components/shared/DetailPageSkeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChartErrorBoundary } from "@/components/shared/ChartErrorBoundary";
import { ServerPagination } from "@/components/shared/ServerPagination";
import { PageWrapper } from "@/components/shared/PageWrapper";

import SupplierHeroHeader from "@/components/suppliers/hero/SupplierHeroHeader";
import SupplierPinnedNote from "@/components/suppliers/hero/SupplierPinnedNote";
import SupplierAlertsBanner from "@/components/suppliers/alerts/SupplierAlertsBanner";
import { SupplierMobileProfile } from "@/components/suppliers/mobile/SupplierMobileProfile";
import { SupplierCompressedHeader } from "@/components/suppliers/mobile/SupplierCompressedHeader";
import { SupplierIconStrip } from "@/components/suppliers/mobile/SupplierIconStrip";
import type { SupplierMobileSectionId } from "@/components/suppliers/mobile/SupplierIconStrip";
import SupplierFormDialog from "@/components/suppliers/SupplierFormDialog";
import SupplierPaymentDialog from "@/components/suppliers/SupplierPaymentDialog";

import { useSupplierDetail, useSupplierNavigation } from "@/hooks/suppliers";
import { useAuth } from "@/hooks/useAuth";
import { useSeo } from "@/hooks/useSeo";
import { buildOgImageUrl } from "@/lib/seo/ogImage";

// Lazy-loaded tabs
const SupplierInfoTab = lazy(() => import("@/components/suppliers/SupplierInfoTab"));
const SupplierFinancialSummary = lazy(() => import("@/components/suppliers/SupplierFinancialSummary"));
const SupplierPaymentsTab = lazy(() => import("@/components/suppliers/SupplierPaymentsTab"));
const SupplierProductsTab = lazy(() => import("@/components/suppliers/SupplierProductsTab"));
const SupplierRatingTab = lazy(() => import("@/components/suppliers/SupplierRatingTab"));
const SupplierActivityTab = lazy(() => import("@/components/suppliers/SupplierActivityTab"));
const SupplierPurchasesChartRPC = lazy(() => import("@/components/suppliers/charts/SupplierPurchasesChartRPC"));
const SupplierAgingChart = lazy(() => import("@/components/suppliers/charts/SupplierAgingChart").then(m => ({ default: m.SupplierAgingChart })));
const SupplierCashFlowChart = lazy(() => import("@/components/suppliers/charts/SupplierCashFlowChart").then(m => ({ default: m.SupplierCashFlowChart })));
const SupplierNotesTab = lazy(() => import("@/components/suppliers/tabs/SupplierNotesTab"));
const SupplierStatementTab = lazy(() => import("@/components/suppliers/tabs/SupplierStatementTab"));
const SupplierAgingReport = lazy(() => import("@/components/suppliers/tabs/SupplierAgingReport"));

const TabFallback = () => <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;

const SupplierDetailsPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const { userRole } = useAuth();
  const canEdit = userRole === 'admin' || userRole === 'warehouse';
  const [searchParams, setSearchParams] = useSearchParams();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [isPrintingStatement, setIsPrintingStatement] = useState(false);
  const [mobileSection, setMobileSection] = useState<SupplierMobileSectionId>('none');
  const [showCompressed, setShowCompressed] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  const activeTab = searchParams.get('tab') || 'info';
  const setActiveTab = useCallback((tab: string) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const detail = useSupplierDetail(id);
  const nav = useSupplierNavigation(id);

  const {
    supplier, isLoading, chartData,
    updateRatingMutation,
    totalPurchases, totalPayments, totalOutstanding, orderCount,
    pendingOrderCount, avgOrderValue, paymentRatio, dso,
    currentBalance, creditLimit, hasHighBalance, lastOrderDate,
    paginatedOrders, orderPage, orderPageSize, goToOrderPage,
    paginatedPayments, paymentPage, paymentPageSize, goToPaymentPage,
  } = detail;

  // Per-supplier SEO with dynamic og:image
  useSeo(
    supplier
      ? {
          title: `المورد ${supplier.name} - نظرة`,
          description: `ملف المورد ${supplier.name}${
            currentBalance ? ` — الرصيد الحالي ${Number(currentBalance).toLocaleString('ar')} ر.س` : ''
          }.`,
          image: buildOgImageUrl({
            title: supplier.name,
            subtitle: 'ملف المورد',
            meta: currentBalance
              ? `الرصيد: ${Number(currentBalance).toLocaleString('ar')} ر.س`
              : undefined,
            variant: 'supplier',
          }),
          noindex: true,
        }
      : undefined,
  );

  useEffect(() => {
    if (!isMobile || !heroRef.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowCompressed(!entry.isIntersecting),
      { threshold: 0.1 }
    );
    observer.observe(heroRef.current);
    return () => observer.disconnect();
  }, [isMobile, supplier]);

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
        type: e.entry_type, reference: e.reference,
        debit: e.debit > 0 ? e.debit.toLocaleString() : '-',
        credit: e.credit > 0 ? e.credit.toLocaleString() : '-',
        balance: e.running_balance.toLocaleString(), status: e.status,
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

  const ordersData = paginatedOrders?.data || [];
  const ordersCount = paginatedOrders?.count || 0;
  const ordersTotalPages = Math.ceil(ordersCount / orderPageSize);
  const paymentsData = paginatedPayments?.data || [];
  const paymentsCount = paginatedPayments?.count || 0;

  const renderMobileSection = () => {
    switch (mobileSection) {
      case 'info': return <Suspense fallback={<TabFallback />}><SupplierInfoTab supplier={supplier} /></Suspense>;
      case 'financial': return <Suspense fallback={<TabFallback />}><SupplierFinancialSummary totalPurchases={totalPurchases} totalPayments={totalPayments} currentBalance={currentBalance} creditLimit={creditLimit} paymentTermsDays={supplier.payment_terms_days || 0} discountPercentage={supplier.discount_percentage || 0} dso={dso} paymentRatio={paymentRatio} /></Suspense>;
      case 'orders': return (
        <Card>
          <CardContent className="p-4">
            {ordersData.length > 0 ? ordersData.map(order => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b last:border-0 cursor-pointer" onClick={() => navigate(`/purchase-orders/${order.id}`)}>
                <div>
                  <p className="font-mono text-sm font-medium">{order.order_number}</p>
                  <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString('ar-EG')}</p>
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">{Number(order.total_amount).toLocaleString()} ج.م</p>
                  {getStatusBadge(order.status)}
                </div>
              </div>
            )) : <p className="text-center text-muted-foreground py-8">لا توجد أوامر شراء</p>}
          </CardContent>
        </Card>
      );
      case 'payments': return <Suspense fallback={<TabFallback />}><SupplierPaymentsTab supplierId={id!} onAddPayment={() => setPaymentDialogOpen(true)} payments={paymentsData} totalCount={paymentsCount} currentPage={paymentPage} pageSize={paymentPageSize} onPageChange={goToPaymentPage} /></Suspense>;
      case 'analytics': return (
        <div className="space-y-4">
          <Suspense fallback={<TabFallback />}><SupplierPurchasesChartRPC chartData={chartData} /></Suspense>
          <Suspense fallback={<TabFallback />}><SupplierAgingChart supplierId={id!} /></Suspense>
          <Suspense fallback={<TabFallback />}><SupplierCashFlowChart monthlyData={chartData?.monthly_data} /></Suspense>
        </div>
      );
      case 'products': return <Suspense fallback={<TabFallback />}><SupplierProductsTab supplierId={id!} /></Suspense>;
      case 'rating': return <Suspense fallback={<TabFallback />}><SupplierRatingTab supplierId={id!} currentRating={(supplier as any).rating || 0} onRatingChange={(r) => updateRatingMutation.mutate(r)} /></Suspense>;
      case 'activity': return <Suspense fallback={<TabFallback />}><SupplierActivityTab supplierId={id!} /></Suspense>;
      case 'attachments': return (
        <div className="space-y-4">
          <FileUpload entityType="supplier" entityId={id!} onUploadComplete={() => queryClient.invalidateQueries({ queryKey: ['attachments', 'supplier', id] })} />
          <AttachmentsList entityType="supplier" entityId={id!} />
        </div>
      );
      case 'statement': return <Suspense fallback={<TabFallback />}><SupplierStatementTab supplierId={id!} supplierName={supplier.name} /></Suspense>;
      case 'notes': return <Suspense fallback={<TabFallback />}><SupplierNotesTab supplierId={id!} /></Suspense>;
      default: return null;
    }
  };

  return (
    <PageWrapper title={`المورد: ${supplier.name}`}>
      <div className="space-y-4">
        {!isMobile && (
          <Button variant="ghost" onClick={() => navigate('/suppliers')} className="mb-2">
            <ArrowRight className="h-4 w-4 ml-2" />العودة للموردين
          </Button>
        )}

        {isMobile && showCompressed && (
          <div className="sticky top-0 z-30 -mx-4 px-4 pt-2 pb-1 bg-background/95 backdrop-blur-sm">
            <SupplierCompressedHeader
              supplier={supplier}
              currentBalance={currentBalance}
              onCreateOrder={handleCreatePurchaseOrder}
              onRecordPayment={() => setPaymentDialogOpen(true)}
              onMoreActions={() => setEditDialogOpen(true)}
            />
          </div>
        )}

        <div ref={heroRef}>
          {isMobile ? (
            <SupplierMobileProfile
              supplier={supplier}
              onEdit={() => setEditDialogOpen(true)}
              onCreatePurchaseOrder={handleCreatePurchaseOrder}
              onRecordPayment={() => setPaymentDialogOpen(true)}
              onPrintStatement={handlePrintStatement}
              totalPurchases={totalPurchases}
              totalPayments={totalPayments}
              totalOutstanding={totalOutstanding}
              orderCount={orderCount}
            />
          ) : (
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
          )}
        </div>

        {/* Pinned Note */}
        <SupplierPinnedNote supplierId={id!} />

        <SupplierAlertsBanner
          currentBalance={currentBalance}
          creditLimit={creditLimit}
          pendingOrderCount={pendingOrderCount}
          lastOrderDate={lastOrderDate}
        />

        {isMobile ? (
          <div className="space-y-3">
            <SupplierIconStrip activeSection={mobileSection} onSectionChange={setMobileSection} />
            {mobileSection !== 'none' && (
              <div className="animate-fade-in">{renderMobileSection()}</div>
            )}
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <ScrollArea className="w-full">
              <TabsList className="flex w-max h-auto gap-1 bg-muted/50 p-1">
                <TabsTrigger value="info" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Info className="h-3.5 w-3.5" />معلومات المورد</TabsTrigger>
                <TabsTrigger value="financial" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><CreditCard className="h-3.5 w-3.5" />الملخص المالي</TabsTrigger>
                <TabsTrigger value="orders" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><ShoppingCart className="h-3.5 w-3.5" />أوامر الشراء ({ordersCount})</TabsTrigger>
                <TabsTrigger value="payments" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><CreditCard className="h-3.5 w-3.5" />المدفوعات</TabsTrigger>
                <TabsTrigger value="statement" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><FileText className="h-3.5 w-3.5" />كشف الحساب</TabsTrigger>
                <TabsTrigger value="aging" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Clock className="h-3.5 w-3.5" />أعمار المستحقات</TabsTrigger>
                <TabsTrigger value="notes" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><StickyNote className="h-3.5 w-3.5" />الملاحظات</TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><BarChart3 className="h-3.5 w-3.5" />التحليلات</TabsTrigger>
                <TabsTrigger value="products" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Package className="h-3.5 w-3.5" />المنتجات</TabsTrigger>
                <TabsTrigger value="rating" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Star className="h-3.5 w-3.5" />التقييم</TabsTrigger>
                <TabsTrigger value="activity" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Activity className="h-3.5 w-3.5" />النشاطات</TabsTrigger>
                <TabsTrigger value="attachments" className="gap-1.5 whitespace-nowrap text-xs px-2.5"><Paperclip className="h-3.5 w-3.5" />المرفقات</TabsTrigger>
              </TabsList>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>

            <TabsContent value="info" className="mt-6">
              <ChartErrorBoundary title="معلومات المورد"><Suspense fallback={<TabFallback />}><SupplierInfoTab supplier={supplier} /></Suspense></ChartErrorBoundary>
            </TabsContent>

            <TabsContent value="financial" className="mt-6">
              <ChartErrorBoundary title="الملخص المالي"><Suspense fallback={<TabFallback />}>
                <SupplierFinancialSummary totalPurchases={totalPurchases} totalPayments={totalPayments} currentBalance={currentBalance} creditLimit={creditLimit} paymentTermsDays={supplier.payment_terms_days || 0} discountPercentage={supplier.discount_percentage || 0} dso={dso} paymentRatio={paymentRatio} />
              </Suspense></ChartErrorBoundary>
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
              <ChartErrorBoundary title="المدفوعات"><Suspense fallback={<TabFallback />}>
                <SupplierPaymentsTab supplierId={id!} onAddPayment={() => setPaymentDialogOpen(true)} payments={paymentsData} totalCount={paymentsCount} currentPage={paymentPage} pageSize={paymentPageSize} onPageChange={goToPaymentPage} />
              </Suspense></ChartErrorBoundary>
            </TabsContent>

            <TabsContent value="statement" className="mt-6">
              <ChartErrorBoundary title="كشف الحساب"><Suspense fallback={<TabFallback />}>
                <SupplierStatementTab supplierId={id!} supplierName={supplier.name} />
              </Suspense></ChartErrorBoundary>
            </TabsContent>

            <TabsContent value="aging" className="mt-6">
              <ChartErrorBoundary title="أعمار المستحقات"><Suspense fallback={<TabFallback />}>
                <SupplierAgingReport supplierId={id!} />
              </Suspense></ChartErrorBoundary>
            </TabsContent>

            <TabsContent value="notes" className="mt-6">
              <ChartErrorBoundary title="الملاحظات"><Suspense fallback={<TabFallback />}>
                <SupplierNotesTab supplierId={id!} />
              </Suspense></ChartErrorBoundary>
            </TabsContent>

            <TabsContent value="analytics" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ChartErrorBoundary title="المشتريات الشهرية"><Suspense fallback={<TabFallback />}><SupplierPurchasesChartRPC chartData={chartData} /></Suspense></ChartErrorBoundary>
                <ChartErrorBoundary title="توزيع أعمار المستحقات"><Suspense fallback={<TabFallback />}><SupplierAgingChart supplierId={id!} /></Suspense></ChartErrorBoundary>
                <ChartErrorBoundary title="التدفق المالي التراكمي"><Suspense fallback={<TabFallback />}><SupplierCashFlowChart monthlyData={chartData?.monthly_data} /></Suspense></ChartErrorBoundary>
              </div>
            </TabsContent>

            <TabsContent value="products" className="mt-6">
              <ChartErrorBoundary title="المنتجات"><Suspense fallback={<TabFallback />}><SupplierProductsTab supplierId={id!} /></Suspense></ChartErrorBoundary>
            </TabsContent>

            <TabsContent value="rating" className="mt-6">
              <ChartErrorBoundary title="التقييم"><Suspense fallback={<TabFallback />}><SupplierRatingTab supplierId={id!} currentRating={(supplier as any).rating || 0} onRatingChange={(r) => updateRatingMutation.mutate(r)} /></Suspense></ChartErrorBoundary>
            </TabsContent>

            <TabsContent value="activity" className="mt-6">
              <ChartErrorBoundary title="النشاطات"><Suspense fallback={<TabFallback />}><SupplierActivityTab supplierId={id!} /></Suspense></ChartErrorBoundary>
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
    </PageWrapper>
  );
};

import { ChartErrorBoundary as PageErrorBoundary } from "@/components/shared/ChartErrorBoundary";
const SupplierDetailsPageWithErrorBoundary = () => (
  <PageErrorBoundary title="تفاصيل المورد"><SupplierDetailsPage /></PageErrorBoundary>
);

export default SupplierDetailsPageWithErrorBoundary;
