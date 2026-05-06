import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import {
  useGoodsReceiptDetails,
  usePostGoodsReceipt,
  useCancelGoodsReceipt,
} from "@/hooks/logistics/useGoodsReceipts";
import {
  useDeliveryNoteDetails,
  usePostDeliveryNote,
  useCancelDeliveryNote,
} from "@/hooks/logistics/useDeliveryNotes";
import {
  usePurchaseInvoiceDetails,
  usePostPurchaseInvoice,
} from "@/hooks/logistics/usePurchaseInvoices";
import {
  GoodsReceiptStatusBadge,
  DeliveryNoteStatusBadge,
  PurchaseInvoiceStatusBadge,
  MatchingStatusBadge,
} from "@/components/logistics/StatusBadges";

type Kind = "goods-receipts" | "delivery-notes" | "purchase-invoices";

export default function LogisticsDocumentDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const kind = location.pathname.split("/")[1] as Kind;

  if (kind === "goods-receipts") return <GRDetails id={id!} navigate={navigate} />;
  if (kind === "delivery-notes") return <DNDetails id={id!} navigate={navigate} />;
  if (kind === "purchase-invoices") return <PIDetails id={id!} navigate={navigate} />;
  return <div className="p-6">نوع المستند غير معروف</div>;
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Button variant="ghost" size="sm" onClick={onBack}>
        <ArrowRight className="h-4 w-4 ml-1" /> رجوع
      </Button>
      <h1 className="text-xl font-bold">{title}</h1>
      <div />
    </div>
  );
}

function ItemsTable({ items, columns }: { items: any[]; columns: { key: string; label: string }[] }) {
  if (!items || items.length === 0)
    return <div className="text-center py-6 text-muted-foreground">لا توجد بنود</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-muted-foreground border-b">
          <tr className="text-right">
            <th className="p-2">المنتج</th>
            {columns.map((c) => <th key={c.key} className="p-2">{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {items.map((it: any) => (
            <tr key={it.id} className="border-b">
              <td className="p-2">{it.products?.name ?? "—"} <span className="text-xs text-muted-foreground">{it.products?.sku}</span></td>
              {columns.map((c) => <td key={c.key} className="p-2">{Number(it[c.key] ?? 0).toLocaleString()}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function GRDetails({ id, navigate }: { id: string; navigate: ReturnType<typeof useNavigate> }) {
  const { header, items } = useGoodsReceiptDetails(id);
  const post = usePostGoodsReceipt();
  const cancel = useCancelGoodsReceipt();
  const h = header.data;
  if (header.isLoading) return <div className="p-6 text-muted-foreground">جارٍ التحميل…</div>;
  if (!h) return <div className="p-6">لم يُعثر على الإيصال</div>;
  return (
    <div className="container mx-auto p-4 space-y-4">
      <Header title={`إيصال استلام ${h.receipt_number}`} onBack={() => navigate("/goods-receipts")} />
      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><div className="text-xs text-muted-foreground">المورد</div><div className="font-medium">{h.suppliers?.name ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">المستودع</div><div className="font-medium">{h.warehouses?.name ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">أمر الشراء</div><div className="font-medium">{h.purchase_orders?.order_number ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">التاريخ</div><div className="font-medium">{h.received_date}</div></div>
        <div><div className="text-xs text-muted-foreground">الحالة</div><GoodsReceiptStatusBadge status={h.status} /></div>
        <div><div className="text-xs text-muted-foreground">تاريخ الترحيل</div><div className="font-medium">{h.posted_at ? new Date(h.posted_at).toLocaleString("ar-EG") : "—"}</div></div>
        {h.notes && <div className="col-span-full"><div className="text-xs text-muted-foreground">ملاحظات</div><div>{h.notes}</div></div>}
      </Card>
      <Card className="p-4">
        <h2 className="font-semibold mb-3">البنود</h2>
        <ItemsTable items={items.data ?? []} columns={[
          { key: "ordered_qty", label: "كمية مطلوبة" },
          { key: "received_qty", label: "كمية مستلمة" },
          { key: "unit_cost", label: "تكلفة الوحدة" },
        ]} />
      </Card>
      {h.status === "draft" && (
        <div className="flex gap-2">
          <Button onClick={() => post.mutate(id)} disabled={post.isPending}><CheckCircle2 className="h-4 w-4 ml-1" /> ترحيل وتحديث المخزون</Button>
          <Button variant="outline" className="text-destructive" onClick={() => {
            const r = prompt("سبب الإلغاء؟"); if (r !== null) cancel.mutate({ id, reason: r || undefined });
          }}><XCircle className="h-4 w-4 ml-1" /> إلغاء</Button>
        </div>
      )}
    </div>
  );
}

function DNDetails({ id, navigate }: { id: string; navigate: ReturnType<typeof useNavigate> }) {
  const { header, items } = useDeliveryNoteDetails(id);
  const post = usePostDeliveryNote();
  const cancel = useCancelDeliveryNote();
  const h = header.data;
  if (header.isLoading) return <div className="p-6 text-muted-foreground">جارٍ التحميل…</div>;
  if (!h) return <div className="p-6">لم يُعثر على الإذن</div>;
  return (
    <div className="container mx-auto p-4 space-y-4">
      <Header title={`إذن تسليم ${h.delivery_number}`} onBack={() => navigate("/delivery-notes")} />
      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><div className="text-xs text-muted-foreground">العميل</div><div className="font-medium">{h.customers?.name ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">المستودع</div><div className="font-medium">{h.warehouses?.name ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">أمر البيع</div><div className="font-medium">{h.sales_orders?.order_number ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">الفاتورة</div><div className="font-medium">{h.invoices?.invoice_number ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">التاريخ</div><div className="font-medium">{h.delivery_date}</div></div>
        <div><div className="text-xs text-muted-foreground">الحالة</div><DeliveryNoteStatusBadge status={h.status} /></div>
        {h.notes && <div className="col-span-full"><div className="text-xs text-muted-foreground">ملاحظات</div><div>{h.notes}</div></div>}
      </Card>
      <Card className="p-4">
        <h2 className="font-semibold mb-3">البنود</h2>
        <ItemsTable items={items.data ?? []} columns={[
          { key: "ordered_qty", label: "كمية مطلوبة" },
          { key: "delivered_qty", label: "كمية مسلّمة" },
        ]} />
      </Card>
      {h.status === "draft" && (
        <div className="flex gap-2">
          <Button onClick={() => post.mutate(id)} disabled={post.isPending}><CheckCircle2 className="h-4 w-4 ml-1" /> تسليم وخصم المخزون</Button>
          <Button variant="outline" className="text-destructive" onClick={() => {
            const r = prompt("سبب الإلغاء؟"); if (r !== null) cancel.mutate({ id, reason: r || undefined });
          }}><XCircle className="h-4 w-4 ml-1" /> إلغاء</Button>
        </div>
      )}
    </div>
  );
}

function PIDetails({ id, navigate }: { id: string; navigate: ReturnType<typeof useNavigate> }) {
  const { header, items } = usePurchaseInvoiceDetails(id);
  const post = usePostPurchaseInvoice();
  const h = header.data;
  if (header.isLoading) return <div className="p-6 text-muted-foreground">جارٍ التحميل…</div>;
  if (!h) return <div className="p-6">لم يُعثر على الفاتورة</div>;
  return (
    <div className="container mx-auto p-4 space-y-4">
      <Header title={`فاتورة مشتريات ${h.invoice_number}`} onBack={() => navigate("/purchase-invoices")} />
      <Card className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><div className="text-xs text-muted-foreground">المورد</div><div className="font-medium">{h.suppliers?.name ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">أمر الشراء</div><div className="font-medium">{h.purchase_orders?.order_number ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">تاريخ الفاتورة</div><div className="font-medium">{h.invoice_date}</div></div>
        <div><div className="text-xs text-muted-foreground">الاستحقاق</div><div className="font-medium">{h.due_date ?? "—"}</div></div>
        <div><div className="text-xs text-muted-foreground">الإجمالي</div><div className="font-bold text-lg">{Number(h.total_amount).toLocaleString()}</div></div>
        <div><div className="text-xs text-muted-foreground">المدفوع</div><div className="font-medium">{Number(h.paid_amount).toLocaleString()}</div></div>
        <div><div className="text-xs text-muted-foreground">الحالة</div><PurchaseInvoiceStatusBadge status={h.status} /></div>
        <div><div className="text-xs text-muted-foreground">المطابقة الثلاثية</div><MatchingStatusBadge status={h.matching_status} /></div>
        {h.approval_required && (
          <div className="col-span-full p-3 bg-destructive/10 text-destructive rounded text-sm">
            ⚠ هذه الفاتورة تتطلب موافقة إدارية بسبب حالة المطابقة.
          </div>
        )}
        {h.notes && <div className="col-span-full"><div className="text-xs text-muted-foreground">ملاحظات</div><div>{h.notes}</div></div>}
      </Card>
      <Card className="p-4">
        <h2 className="font-semibold mb-3">البنود</h2>
        <ItemsTable items={items.data ?? []} columns={[
          { key: "quantity", label: "الكمية" },
          { key: "unit_price", label: "سعر الوحدة" },
          { key: "total_price", label: "الإجمالي" },
        ]} />
      </Card>
      {h.status === "draft" && (
        <div className="flex gap-2">
          <Button onClick={() => post.mutate(id)} disabled={post.isPending}><CheckCircle2 className="h-4 w-4 ml-1" /> ترحيل (يُشغّل المطابقة الثلاثية)</Button>
        </div>
      )}
    </div>
  );
}
