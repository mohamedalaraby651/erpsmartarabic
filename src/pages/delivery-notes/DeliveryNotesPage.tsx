import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Truck, CheckCircle2, XCircle } from "lucide-react";
import {
  useDeliveryNotesList,
  useCreateDeliveryNote,
  usePostDeliveryNote,
  useCancelDeliveryNote,
} from "@/hooks/logistics/useDeliveryNotes";
import { DeliveryNoteStatusBadge } from "@/components/logistics/StatusBadges";
import { DeliveryNoteDialog } from "@/components/logistics/LogisticsDialogs";

export default function DeliveryNotesPage() {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const { data: rows = [], isLoading } = useDeliveryNotesList(search);
  const create = useCreateDeliveryNote();
  const post = usePostDeliveryNote();
  const cancel = useCancelDeliveryNote();

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="h-6 w-6 text-primary" />
            إذونات تسليم البضاعة
          </h1>
          <p className="text-sm text-muted-foreground">إدارة تسليمات العملاء وخصم المخزون</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 ml-1" /> إذن جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="text-2xl font-bold">{rows.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">مسودات</div><div className="text-2xl font-bold text-warning">{rows.filter(r => r.status === "draft").length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">تم التسليم</div><div className="text-2xl font-bold text-success">{rows.filter(r => r.status === "delivered").length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">ملغاة</div><div className="text-2xl font-bold text-destructive">{rows.filter(r => r.status === "cancelled").length}</div></Card>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pr-9" placeholder="ابحث برقم الإذن…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">لا توجد إذونات تسليم بعد.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="text-right">
                  <th className="p-2">الرقم</th><th className="p-2">العميل</th>
                  <th className="p-2">المستودع</th><th className="p-2">التاريخ</th>
                  <th className="p-2">الحالة</th><th className="p-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-mono">{r.delivery_number}</td>
                    <td className="p-2">{r.customers?.name ?? "—"}</td>
                    <td className="p-2">{r.warehouses?.name ?? "—"}</td>
                    <td className="p-2 text-xs">{r.delivery_date}</td>
                    <td className="p-2"><DeliveryNoteStatusBadge status={r.status} /></td>
                    <td className="p-2">
                      <div className="flex items-center gap-1">
                        {(r.status === "draft" || r.status === "in_transit") && (
                          <Button size="sm" variant="ghost" className="text-success h-8 px-2"
                            onClick={() => post.mutate(r.id)} disabled={post.isPending}>
                            <CheckCircle2 className="h-4 w-4 ml-1" /> تسليم
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

      <DeliveryNoteDialog open={open} onOpenChange={setOpen} loading={create.isPending}
        onSubmit={async (draft) => { await create.mutateAsync(draft); }} />
    </div>
  );
}
