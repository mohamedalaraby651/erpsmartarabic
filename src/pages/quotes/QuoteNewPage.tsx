import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowRight, Save, Plus, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useCreateQuote } from "@/hooks/sales-cycle/useQuotes";
import { customerRepository } from "@/application/queries/customers";
import { referenceRepository } from "@/application/queries/reference";
import type { Database } from "@/integrations/supabase/types";
import { useQuotationItems } from "@/components/quotations/useQuotationItems";
import { QuotationItemsTable } from "@/components/quotations/QuotationItemsTable";
import { LivePreviewPanel } from "@/components/settings/ExportCenter/LivePreviewPanel";
import { useLivePreviewProfile } from "@/components/settings/ExportCenter/useLivePreviewProfile";
import { QuotationPrintView } from "@/components/print/QuotationPrintView";

type Product = Database["public"]["Tables"]["products"]["Row"];

export default function QuoteNewPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const create = useCreateQuote();
  const { profile: pdfProfile } = useLivePreviewProfile();

  const [customerId, setCustomerId] = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [lastSavedId, setLastSavedId] = useState<string | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  const { data: customers = [] } = useQuery({
    queryKey: ["customers", "select"],
    queryFn: () => customerRepository.listForSelect(500),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products", "active"],
    queryFn: () => referenceRepository.listActiveProducts() as Promise<Product[]>,
  });

  const {
    items,
    addItem,
    updateItem,
    removeItem,
    subtotal,
    totalAfterDiscount,
    taxAmount,
    grandTotal,
    vatEnabled,
    setVatEnabled,
    discountAmount,
    setDiscountAmount,
    validate,
  } = useQuotationItems({ products });

  const submit = async () => {
    if (!customerId) {
      toast({ title: "العميل مطلوب", variant: "destructive" });
      return;
    }
    if (items.length === 0) {
      toast({ title: "أضف بنداً واحداً على الأقل", variant: "destructive" });
      return;
    }
    const errors = validate();
    if (errors.length > 0) {
      toast({ title: "بيانات غير صحيحة", description: errors[0].message, variant: "destructive" });
      return;
    }

    const created = await create.mutateAsync({
      customer_id: customerId,
      quote_date: quoteDate,
      valid_until: validUntil,
      notes: notes || null,
      subtotal,
      discount_amount: discountAmount,
      tax_amount: taxAmount,
      total_amount: grandTotal,
      items: items.map((it) => ({
        product_id: it.product_id,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        discount_percentage: Number(it.discount_percentage || 0),
      })),
    });
    const newId = (created as { id?: string } | null)?.id ?? null;
    if (newId) {
      setLastSavedId(newId);
      toast({ title: "تم الحفظ", description: "يمكنك الآن طباعة PDF" });
    } else {
      navigate("/quotes");
    }
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">عرض سعر جديد</h1>
        <Button variant="outline" onClick={() => navigate("/quotes")}>
          <ArrowRight className="h-4 w-4 ml-1" /> رجوع
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label>العميل</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="اختر العميل" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>تاريخ العرض</Label>
            <Input type="date" value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} />
          </div>
          <div>
            <Label>صالح حتى</Label>
            <Input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>الملاحظات</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
        </div>
      </Card>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">البنود</h2>
          <Button type="button" variant="outline" size="sm" onClick={addItem}>
            <Plus className="h-4 w-4 ml-2" /> إضافة منتج
          </Button>
        </div>

        <QuotationItemsTable
          items={items}
          products={products}
          onAddItem={addItem}
          onUpdateItem={updateItem}
          onRemoveItem={removeItem}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2">
          <div className="hidden lg:block">
            <LivePreviewPanel profile={pdfProfile} height={420} />
          </div>
          <div className="space-y-3 bg-muted p-4 rounded-lg">
            <div className="flex justify-between">
              <span>المجموع الفرعي:</span>
              <span className="font-bold">{subtotal.toLocaleString()} ج.م</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>الخصم:</span>
              <Input
                type="number"
                step="0.01"
                className="w-32"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value) || 0)}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>بعد الخصم:</span>
              <span>{totalAfterDiscount.toLocaleString()} ج.م</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>ضريبة القيمة المضافة (14%):</span>
              <label className="inline-flex items-center cursor-pointer gap-2">
                <input
                  type="checkbox"
                  checked={vatEnabled}
                  onChange={(e) => setVatEnabled(e.target.checked)}
                  className="h-4 w-4"
                />
                <span className="text-sm text-muted-foreground">
                  {vatEnabled ? `مفعّل (${taxAmount.toLocaleString()} ج.م)` : "معطّل"}
                </span>
              </label>
            </div>
            <div className="flex justify-between text-lg border-t pt-3">
              <span className="font-bold">الإجمالي:</span>
              <span className="font-bold text-primary">{grandTotal.toLocaleString()} ج.م</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {lastSavedId && (
            <Button type="button" variant="outline" onClick={() => setPrintOpen(true)}>
              <Printer className="h-4 w-4 ml-1" /> طباعة PDF
            </Button>
          )}
          <Button
            onClick={submit}
            disabled={create.isPending || !customerId || items.length === 0 || !!lastSavedId}
          >
            <Save className="h-4 w-4 ml-1" /> حفظ عرض السعر
          </Button>
        </div>
      </Card>

      {lastSavedId && (
        <QuotationPrintView
          quotationId={lastSavedId}
          open={printOpen}
          onOpenChange={setPrintOpen}
        />
      )}
    </div>
  );
}
