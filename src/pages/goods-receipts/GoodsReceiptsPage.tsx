import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, PackageCheck, CheckCircle2, XCircle } from "lucide-react";
import {
  useGoodsReceiptsList,
  useCreateGoodsReceipt,
  usePostGoodsReceipt,
  useCancelGoodsReceipt,
} from "@/hooks/logistics/useGoodsReceipts";
import { GoodsReceiptStatusBadge } from "@/components/logistics/StatusBadges";
import { GoodsReceiptDialog } from "@/components/logistics/LogisticsDialogs";

export default function GoodsReceiptsPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading } = useGoodsReceiptsList(search);
  const create = useCreateGoodsReceipt();
  const post = usePostGoodsReceipt();
  const cancel = useCancelGoodsReceipt();

  const draftCount = rows.filter(r => r.status === "draft").length;
  const postedCount = rows.filter(r => r.status === "posted").length;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <PackageCheck className="h-6 w-6 text-primary" />
            إيصالات استلام البضاعة
          </h1>
          <p className="text-sm text-muted-foreground">إدارة استلامات الموردين وحركة المخزون التلقائية</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 ml-1" /> إيصال جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="text-2xl font-bold">{rows.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">مسودات</div><div className="text-2xl font-bold text-warning">{draftCount}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">مرحّلة</div><div className="text-2xl font-bold text-success">{postedCount}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">ملغاة</div><div className="text-2xl font-bold text-destructive">{rows.filter(r => r.status === "cancelled").length}</div></Card>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="ابحث برقم الإيصال…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">لا توجد إيصالات. ابدأ بإنشاء أول إيصال.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="text-right">
                  <th className="p-2">الرقم</th>
                  <th className="p-2">المورد</th>
                  <th className="p-2">المستودع</th>
                  <th className="p-2">أمر الشراء</th>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-mono">{r.receipt_number}</td>
                    <td className="p-2">{r.suppliers?.name ?? "—"}</td>
                    <td className="p-2">{r.warehouses?.name ?? "—"}</td>
                    <td className="p-2 text-xs text-muted-foreground">{r.purchase_orders?.order_number ?? "—"}</td>
                    <td className="p-2 text-xs">{r.received_date}</td>
                    <td className="p-2"><GoodsReceiptStatusBadge status={r.status} /></td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {r.status === "draft" && (
                          <Button size="sm" variant="ghost" className="text-success h-8 px-2"
                            onClick={() => post.mutate(r.id)} disabled={post.isPending}>
                            <CheckCircle2 className="h-4 w-4 ml-1" /> ترحيل
                          </Button>
                        )}
                        {r.status !== "cancelled" && (
                          <Button size="sm" variant="ghost" className="text-destructive h-8 px-2"
                            onClick={() => {
                              const reason = prompt("سبب الإلغاء؟");
                              if (reason !== null) cancel.mutate({ id: r.id, reason: reason || undefined });
                            }} disabled={cancel.isPending}>
                            <XCircle className="h-4 w-4 ml-1" /> إلغاء
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <GoodsReceiptDialog open={open} onOpenChange={setOpen} loading={create.isPending}
        onSubmit={async (draft) => { await create.mutateAsync(draft); }} />
    </div>
  );
}
