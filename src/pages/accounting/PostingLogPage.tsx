import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { BookOpen, AlertCircle, CheckCircle2, MinusCircle } from "lucide-react";

interface LogRow {
  id: string;
  document_type: string;
  document_id: string;
  document_number: string | null;
  journal_id: string | null;
  status: "success" | "skipped" | "failed";
  reason: string | null;
  total_amount: number | null;
  created_at: string;
}

const TYPE_LABEL: Record<string, string> = {
  goods_receipt: "إيصال استلام",
  purchase_invoice: "فاتورة مشتريات",
  delivery_note: "إذن تسليم",
};
const TYPE_ROUTE: Record<string, string> = {
  goods_receipt: "/goods-receipts",
  purchase_invoice: "/purchase-invoices",
  delivery_note: "/delivery-notes",
};

function StatusBadge({ s }: { s: LogRow["status"] }) {
  if (s === "success")
    return <Badge className="bg-success/10 text-success border-success/30"><CheckCircle2 className="h-3 w-3 ml-1" /> نجح</Badge>;
  if (s === "skipped")
    return <Badge variant="outline"><MinusCircle className="h-3 w-3 ml-1" /> متخطّى</Badge>;
  return <Badge variant="destructive"><AlertCircle className="h-3 w-3 ml-1" /> فشل</Badge>;
}

export default function PostingLogPage() {
  const navigate = useNavigate();
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["document-posting-log"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_posting_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as LogRow[];
    },
  });

  const failed = rows.filter((r) => r.status === "failed").length;
  const success = rows.filter((r) => r.status === "success").length;
  const skipped = rows.filter((r) => r.status === "skipped").length;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">سجل الترحيل المحاسبي</h1>
          <p className="text-sm text-muted-foreground">
            تتبّع تلقائي للقيود اليومية المتولّدة من إيصالات الاستلام، إذونات التسليم، وفواتير المشتريات.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4"><div className="text-xs text-muted-foreground">الإجمالي</div><div className="text-2xl font-bold">{rows.length}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">قيود ناجحة</div><div className="text-2xl font-bold text-success">{success}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">متخطّاة</div><div className="text-2xl font-bold">{skipped}</div></Card>
        <Card className="p-4"><div className="text-xs text-muted-foreground">فشل</div><div className="text-2xl font-bold text-destructive">{failed}</div></Card>
      </div>

      {failed > 0 && (
        <Card className="p-4 bg-destructive/5 border-destructive/30 text-sm">
          ⚠ يوجد {failed} عملية ترحيل فاشلة. الأسباب الشائعة: <strong>غياب ربط حساب</strong> (INVENTORY, AP, COGS, GR_IR_CLEARING) أو <strong>فترة مالية مغلقة</strong>.
          راجع <button className="underline text-primary" onClick={() => navigate("/accounting/chart-of-accounts")}>دليل الحسابات</button>.
        </Card>
      )}

      <Card className="p-4">
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد قيود محاسبية مولّدة بعد. ستظهر هنا تلقائياً عند ترحيل أول وثيقة.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="text-right">
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">النوع</th>
                  <th className="p-2">الرقم</th>
                  <th className="p-2">المبلغ</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">السبب / ملاحظة</th>
                  <th className="p-2">القيد</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 text-xs">{new Date(r.created_at).toLocaleString("ar-EG")}</td>
                    <td className="p-2">{TYPE_LABEL[r.document_type] ?? r.document_type}</td>
                    <td className="p-2">
                      <button
                        className="font-mono text-primary hover:underline"
                        onClick={() => navigate(`${TYPE_ROUTE[r.document_type]}/${r.document_id}`)}
                      >
                        {r.document_number ?? r.document_id.slice(0, 8)}
                      </button>
                    </td>
                    <td className="p-2 font-semibold">
                      {r.total_amount != null ? Number(r.total_amount).toLocaleString() : "—"}
                    </td>
                    <td className="p-2"><StatusBadge s={r.status} /></td>
                    <td className="p-2 text-xs text-muted-foreground max-w-[280px] truncate">{r.reason ?? "—"}</td>
                    <td className="p-2">
                      {r.journal_id ? (
                        <button
                          className="text-primary hover:underline text-xs"
                          onClick={() => navigate(`/accounting/journals?journal=${r.journal_id}`)}
                        >
                          عرض القيد
                        </button>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
