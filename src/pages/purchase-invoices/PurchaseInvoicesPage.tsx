import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, CheckCircle2 } from "lucide-react";
import {
  usePurchaseInvoicesList,
  useCreatePurchaseInvoice,
  usePostPurchaseInvoice,
} from "@/hooks/logistics/usePurchaseInvoices";
import { PurchaseInvoiceStatusBadge, MatchingStatusBadge } from "@/components/logistics/StatusBadges";
import { PurchaseInvoiceDialog } from "@/components/logistics/LogisticsDialogs";

export default function PurchaseInvoicesPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading } = usePurchaseInvoicesList(search);
  const create = useCreatePurchaseInvoice();
  const post = usePostPurchaseInvoice();

  const totalDue = rows
    .filter(r => r.status === "posted" && r.payment_status !== "paid")
    .reduce((s, r) => s + (Number(r.total_amount) - Number(r.paid_amount)), 0);

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            فواتير المشتريات
          </h1>
          <p className="text-sm text-muted-foreground">المطابقة الثلاثية: أمر شراء ↔ استلام ↔ فاتورة</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 ml-1" /> فاتورة جديدة
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="text-2xl font-bold">{rows.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">مسودات</div><div className="text-2xl font-bold text-warning">{rows.filter(r => r.status === "draft").length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">تتطلب موافقة</div><div className="text-2xl font-bold text-destructive">{rows.filter(r => r.approval_required && r.status === "posted").length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">إجمالي المستحق</div><div className="text-2xl font-bold">{totalDue.toLocaleString()}</div></Card>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="ابحث برقم الفاتورة…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">لا توجد فواتير مشتريات بعد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="text-right">
                  <th className="p-2">الرقم</th><th className="p-2">المورد</th>
                  <th className="p-2">أمر الشراء</th><th className="p-2">التاريخ</th>
                  <th className="p-2">الإجمالي</th><th className="p-2">الحالة</th>
                  <th className="p-2">المطابقة</th><th className="p-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-mono">{r.invoice_number}</td>
                    <td className="p-2">{r.suppliers?.name ?? "—"}</td>
                    <td className="p-2 text-xs text-muted-foreground">{r.purchase_orders?.order_number ?? "—"}</td>
                    <td className="p-2 text-xs">{r.invoice_date}</td>
                    <td className="p-2 font-semibold">{Number(r.total_amount).toLocaleString()}</td>
                    <td className="p-2"><PurchaseInvoiceStatusBadge status={r.status} /></td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        <MatchingStatusBadge status={r.matching_status} />
                        {r.approval_required && <span className="text-xs text-destructive">⚠</span>}
                      </div>
                    </td>
                    <td className="p-2">
                      {r.status === "draft" && (
                        <Button size="sm" variant="ghost" className="text-success h-8 px-2"
                          onClick={() => post.mutate(r.id)} disabled={post.isPending}>
                          <CheckCircle2 className="h-4 w-4 ml-1" /> ترحيل
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <PurchaseInvoiceDialog open={open} onOpenChange={setOpen} loading={create.isPending}
        onSubmit={async (draft) => { await create.mutateAsync(draft); }} />
    </div>
  );
}
