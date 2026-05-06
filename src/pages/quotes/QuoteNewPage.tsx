import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { ArrowRight, Save } from "lucide-react";
import LogisticsItemsTable, { ItemRow } from "@/components/logistics/LogisticsItemsTable";
import { useCreateQuote } from "@/hooks/sales-cycle/useQuotes";

export default function QuoteNewPage() {
  const navigate = useNavigate();
  const create = useCreateQuote();

  const [customerId, setCustomerId] = useState("");
  const [quoteDate, setQuoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)
  );
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);

  const { data: customers = [] } = useQuery({
    queryKey: ["sc-customers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id,name")
        .order("name")
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const total = items.reduce(
    (s, it) =>
      s +
      Number(it.quantity || 0) *
        Number(it.unit_price || 0) *
        (1 - Number(it.discount_percentage || 0) / 100),
    0
  );

  const submit = async () => {
    if (!customerId) return;
    const valid = items.filter((it) => it.product_id && Number(it.quantity) > 0);
    if (valid.length === 0) return;

    await create.mutateAsync({
      customer_id: customerId,
      quote_date: quoteDate,
      valid_until: validUntil,
      notes: notes || null,
      items: valid.map((it) => ({
        product_id: it.product_id,
        quantity: Number(it.quantity),
        unit_price: Number(it.unit_price),
        discount_percentage: Number(it.discount_percentage || 0),
      })),
    });
    navigate("/quotes");
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
                {customers.map((c: any) => (
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

      <Card className="p-4">
        <h2 className="font-semibold mb-3">البنود</h2>
        <LogisticsItemsTable
          value={items}
          onChange={setItems}
          columns={[
            { key: "quantity", label: "الكمية", type: "number", step: "0.01", min: 0, default: 1 },
            { key: "unit_price", label: "سعر الوحدة", type: "number", step: "0.01", min: 0, default: 0 },
            { key: "discount_percentage", label: "الخصم %", type: "number", step: "0.01", min: 0, default: 0 },
          ]}
          newRow={() => ({ product_id: "", quantity: 1, unit_price: 0, discount_percentage: 0 })}
        />

        <div className="mt-4 flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            الإجمالي: <span className="font-bold text-lg text-primary">{total.toFixed(2)}</span>
          </div>
          <Button onClick={submit} disabled={create.isPending || !customerId || items.length === 0}>
            <Save className="h-4 w-4 ml-1" /> حفظ عرض السعر
          </Button>
        </div>
      </Card>
    </div>
  );
}
