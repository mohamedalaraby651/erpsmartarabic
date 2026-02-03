import { memo } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2 } from 'lucide-react';

export interface ItemRow {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  total_price: number;
}

export interface Product {
  id: string;
  name: string;
  selling_price?: number | null;
  cost_price?: number | null;
}

interface ResponsiveItemsTableProps {
  items: ItemRow[];
  products: Product[];
  onUpdateItem: (index: number, field: keyof ItemRow, value: string | number) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
  currency?: string;
  priceField?: 'selling_price' | 'cost_price';
}

const MobileItemCard = memo(function MobileItemCard({
  item,
  index,
  products,
  currency,
  onUpdateItem,
  onRemoveItem,
}: {
  item: ItemRow;
  index: number;
  products: Product[];
  currency: string;
  onUpdateItem: (index: number, field: keyof ItemRow, value: string | number) => void;
  onRemoveItem: (index: number) => void;
}) {
  return (
    <Card className="p-3">
      <div className="space-y-3">
        {/* Product Select - Full Width */}
        <Select
          value={item.product_id}
          onValueChange={(v) => onUpdateItem(index, 'product_id', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="اختر المنتج" />
          </SelectTrigger>
          <SelectContent>
            {products.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Quantity & Price Row */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-xs text-muted-foreground">الكمية</Label>
            <Input
              type="number"
              min="1"
              value={item.quantity}
              onChange={(e) => onUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
              className="h-9"
            />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">السعر</Label>
            <Input
              type="number"
              step="0.01"
              value={item.unit_price}
              onChange={(e) => onUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
              className="h-9"
            />
          </div>
        </div>

        {/* Discount & Total Row */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground">خصم %</Label>
            <Input
              type="number"
              min="0"
              max="100"
              className="w-16 h-9"
              value={item.discount_percentage}
              onChange={(e) => onUpdateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold text-lg">
              {item.total_price.toLocaleString()} {currency}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive"
              onClick={() => onRemoveItem(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
});

const DesktopItemRow = memo(function DesktopItemRow({
  item,
  index,
  products,
  onUpdateItem,
  onRemoveItem,
}: {
  item: ItemRow;
  index: number;
  products: Product[];
  onUpdateItem: (index: number, field: keyof ItemRow, value: string | number) => void;
  onRemoveItem: (index: number) => void;
}) {
  return (
    <TableRow>
      <TableCell className="min-w-48">
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
      <TableCell className="w-24">
        <Input
          type="number"
          min="1"
          value={item.quantity}
          onChange={(e) => onUpdateItem(index, 'quantity', parseInt(e.target.value) || 1)}
        />
      </TableCell>
      <TableCell className="w-32">
        <Input
          type="number"
          step="0.01"
          value={item.unit_price}
          onChange={(e) => onUpdateItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
        />
      </TableCell>
      <TableCell className="w-24">
        <Input
          type="number"
          min="0"
          max="100"
          value={item.discount_percentage}
          onChange={(e) => onUpdateItem(index, 'discount_percentage', parseFloat(e.target.value) || 0)}
        />
      </TableCell>
      <TableCell className="w-32">
        <span className="font-bold">{item.total_price.toLocaleString()}</span>
      </TableCell>
      <TableCell className="w-16">
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
  );
});

export const ResponsiveItemsTable = memo(function ResponsiveItemsTable({
  items,
  products,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
  currency = 'ج.م',
  priceField = 'selling_price',
}: ResponsiveItemsTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label className="font-medium">المنتجات ({items.length})</Label>
          <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
            <Plus className="h-4 w-4 ml-1" />
            إضافة
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border rounded-lg">
            لا توجد منتجات - اضغط على "إضافة"
          </div>
        ) : (
          items.map((item, index) => (
            <MobileItemCard
              key={index}
              item={item}
              index={index}
              products={products}
              currency={currency}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
            />
          ))
        )}
      </div>
    );
  }

  // Desktop: Table layout
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Label className="font-medium">المنتجات</Label>
        <Button type="button" variant="outline" size="sm" onClick={onAddItem}>
          <Plus className="h-4 w-4 ml-2" />
          إضافة منتج
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
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
                  <DesktopItemRow
                    key={index}
                    item={item}
                    index={index}
                    products={products}
                    onUpdateItem={onUpdateItem}
                    onRemoveItem={onRemoveItem}
                  />
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
});

export default ResponsiveItemsTable;
