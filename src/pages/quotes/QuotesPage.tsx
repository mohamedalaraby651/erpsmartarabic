import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Search, Send, CheckCircle2, XCircle, ArrowRight } from "lucide-react";
import {
  useQuotesList,
  useUpdateQuoteStatus,
  useConvertQuoteToOrder,
} from "@/hooks/sales-cycle/useQuotes";
import { QuoteStatusBadge } from "@/components/sales-cycle/QuoteStatusBadge";

export default function QuotesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: rows = [], isLoading } = useQuotesList(search);
  const updateStatus = useUpdateQuoteStatus();
  const convert = useConvertQuoteToOrder();

  const draftCount = rows.filter((r) => r.status === "draft").length;
  const acceptedCount = rows.filter((r) => r.status === "accepted").length;
  const convertedCount = rows.filter((r) => r.status === "converted").length;

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            عروض الأسعار
          </h1>
          <p className="text-sm text-muted-foreground">
            إدارة عروض الأسعار وتحويلها لأوامر بيع تلقائياً
          </p>
        </div>
        <Button onClick={() => navigate("/quotes/new")}>
          <Plus className="h-4 w-4 ml-1" /> عرض سعر جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">الإجمالي</div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">مسودات</div>
          <div className="text-2xl font-bold text-warning">{draftCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">مقبولة</div>
          <div className="text-2xl font-bold text-success">{acceptedCount}</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">محوّلة</div>
          <div className="text-2xl font-bold text-primary">{convertedCount}</div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pr-9"
            placeholder="ابحث برقم العرض…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">جارٍ التحميل…</div>
        ) : rows.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            لا توجد عروض أسعار. ابدأ بإنشاء أول عرض.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-muted-foreground border-b">
                <tr className="text-right">
                  <th className="p-2">الرقم</th>
                  <th className="p-2">العميل</th>
                  <th className="p-2">التاريخ</th>
                  <th className="p-2">صالح حتى</th>
                  <th className="p-2">الإجمالي</th>
                  <th className="p-2">الحالة</th>
                  <th className="p-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b hover:bg-muted/30 cursor-pointer"
                    onClick={() => navigate(`/quotes/${r.id}`)}
                  >
                    <td className="p-2 font-mono">{r.quote_number}</td>
                    <td className="p-2">{r.customers?.name ?? "—"}</td>
                    <td className="p-2 text-xs">{r.quote_date}</td>
                    <td className="p-2 text-xs">{r.valid_until}</td>
                    <td className="p-2 font-medium">{r.total_amount.toFixed(2)}</td>
                    <td className="p-2">
                      <QuoteStatusBadge status={r.status} />
                    </td>
                    <td className="p-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {r.status === "draft" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2"
                            onClick={() =>
                              updateStatus.mutate({ id: r.id, status: "sent" })
                            }
                          >
                            <Send className="h-4 w-4 ml-1" /> إرسال
                          </Button>
                        )}
                        {r.status === "sent" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-success"
                              onClick={() =>
                                updateStatus.mutate({ id: r.id, status: "accepted" })
                              }
                            >
                              <CheckCircle2 className="h-4 w-4 ml-1" /> قبول
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2 text-destructive"
                              onClick={() =>
                                updateStatus.mutate({ id: r.id, status: "rejected" })
                              }
                            >
                              <XCircle className="h-4 w-4 ml-1" /> رفض
                            </Button>
                          </>
                        )}
                        {(r.status === "accepted" || r.status === "sent") && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 px-2"
                            onClick={() => convert.mutate(r.id)}
                            disabled={convert.isPending}
                          >
                            <ArrowRight className="h-4 w-4 ml-1" /> تحويل لأمر بيع
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
    </div>
  );
}
