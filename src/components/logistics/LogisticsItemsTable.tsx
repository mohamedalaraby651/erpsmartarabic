import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productRepository } from "@/lib/repositories/productRepository";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";

export interface ItemColumn {
  key: string;
  label: string;
  type?: "number" | "text";
  step?: string;
  default?: number | string;
  min?: number;
}

export interface ItemRow {
  product_id: string;
  [k: string]: any;
}

interface Props {
  value: ItemRow[];
  onChange: (rows: ItemRow[]) => void;
  columns: ItemColumn[];
  newRow?: () => Partial<ItemRow>;
}

export default function LogisticsItemsTable({ value, onChange, columns, newRow }: Props) {
  const [rows, setRows] = useState<ItemRow[]>(value);

  // Sync rows -> parent
  useEffect(() => {
    onChange(rows);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows]);

  const { data: products = [] } = useQuery({
    queryKey: [...queryKeys.products.lists(), 'light'] as const,
    queryFn: () => productRepository.findActiveLight(500),
  });

  const addRow = () => {
    const base: ItemRow = { product_id: "" };
    columns.forEach((c) => {
      if (c.default !== undefined) base[c.key] = c.default;
      else if (c.type === "number") base[c.key] = 0;
    });
    setRows((r) => [...r, { ...base, ...(newRow?.() || {}) }]);
  };

  const updateRow = (idx: number, patch: Partial<ItemRow>) => {
    setRows((r) => r.map((row, i) => (i === idx ? { ...row, ...patch } : row)));
  };

  const removeRow = (idx: number) => {
    setRows((r) => r.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>البنود ({rows.length})</Label>
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          <Plus className="h-4 w-4 ml-1" />
          إضافة بند
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-md">
          لم يُضَف أي بند بعد
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-auto">
          {rows.map((row, idx) => (
            <div
              key={idx}
              className="grid gap-2 p-3 border rounded-md bg-muted/20"
              style={{
                gridTemplateColumns: `2fr ${columns.map(() => "1fr").join(" ")} auto`,
              }}
            >
              <Select
                value={row.product_id}
                onValueChange={(v) => {
                  const p = products.find((x) => x.id === v);
                  updateRow(idx, {
                    product_id: v,
                    ...(columns.some((c) => c.key === "unit_cost") && p?.cost_price
                      ? { unit_cost: Number(p.cost_price) }
                      : {}),
                    ...(columns.some((c) => c.key === "unit_price") && p?.selling_price
                      ? { unit_price: Number(p.selling_price) }
                      : {}),
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.sku ? `(${p.sku})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {columns.map((col) => (
                <Input
                  key={col.key}
                  type={col.type ?? "text"}
                  step={col.step}
                  min={col.min}
                  placeholder={col.label}
                  value={row[col.key] ?? ""}
                  onChange={(e) =>
                    updateRow(idx, {
                      [col.key]:
                        col.type === "number" ? Number(e.target.value || 0) : e.target.value,
                    })
                  }
                />
              ))}

              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => removeRow(idx)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
