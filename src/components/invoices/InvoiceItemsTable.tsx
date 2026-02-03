import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Product = Database['public']['Tables']['products']['Row'];

export interface InvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  total_price: number;
}

interface InvoiceItemsTableProps {
  items: InvoiceItem[];
  products: Product[];
  onAddItem: () => void;
  onUpdateItem: (index: number, field: keyof InvoiceItem, value: string | number) => void;
  onRemoveItem: (index: number) => void;
}

export function InvoiceItemsTable({
  items,
  products,
  onAddItem,
  onUpdateItem,
  onRemoveItem,
}: InvoiceItemsTableProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium">المنتجات</span>
        <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة منتج
        </Button>
      </div>
      
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>المنتج</TableHead>
              <TableHead className="w-24">الكمية</TableHead>
              <TableHead className="w-32">السعر</TableHead>
              <TableHead className="w-24">الخصم %</TableHead>
              <TableHead className="w-32">الإجمالي</TableHead>
              <TableHead className="w-16"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  لا توجد منتجات - اضغط على "إضافة منتج"
                </TableCell>
              </TableRow>
            ) : (
              items.map((item, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Select
                      value={item.product_id}
                      onValueChange={(value) => onUpdateItem(index, 'product_id', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="اختر المنتج" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => onUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.unit_price}
                      onChange={(e) => onUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={item.discount_percentage}
                      onChange={(e) => onUpdateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
                    />
                  </TableCell>
                  <TableCell>
                    <span className="font-bold">{item.total_price.toLocaleString()}</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveItem(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
