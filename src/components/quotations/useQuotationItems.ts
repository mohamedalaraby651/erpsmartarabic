import { useState, useCallback, useMemo } from 'react';
import { legacyQuotationsRepository } from '@/application/queries/quotations';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];

export interface QuotationItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  total_price: number;
}

interface UseQuotationItemsProps {
  products: Product[];
  /** Optional initial VAT toggle state (default: false). */
  initialVatEnabled?: boolean;
  /** VAT rate to apply when enabled (default 0.14 = 14%). */
  vatRate?: number;
}

/** Strict financial rounding helper (two decimals). */
export const r2 = (n: number): number => Math.round((Number(n) || 0) * 100) / 100;

export interface QuotationValidationError {
  index: number;
  field: 'product_id' | 'quantity' | 'discount_percentage';
  message: string;
}

export function useQuotationItems({
  products,
  initialVatEnabled = false,
  vatRate = 0.14,
}: UseQuotationItemsProps) {
  const [items, setItems] = useState<QuotationItem[]>([]);
  const [vatEnabled, setVatEnabled] = useState<boolean>(initialVatEnabled);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const loadItems = useCallback(async (quotationId: string) => {
    try {
      const data = await legacyQuotationsRepository.listItemsForEditor(quotationId);
      type LoadedItem = {
        product_id: string;
        quantity: number;
        unit_price: number;
        discount_percentage: number | null;
        total_price: number;
        products: { name: string } | null;
      };
      setItems((data as unknown as LoadedItem[]).map((item) => ({
        product_id: item.product_id,
        product_name: item.products?.name || '',
        quantity: Number(item.quantity),
        unit_price: r2(Number(item.unit_price)),
        discount_percentage: r2(Number(item.discount_percentage) || 0),
        total_price: r2(Number(item.total_price)),
      })));
    } catch {
      setItems([]);
    }
  }, []);

  const addItem = useCallback(() => {
    setItems(prev => [...prev, {
      product_id: '',
      product_name: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      total_price: 0,
    }]);
  }, []);

  const updateItem = useCallback((index: number, field: keyof QuotationItem, value: string | number) => {
    setItems(prev => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };

      if (field === 'product_id') {
        const product = products.find(p => p.id === value);
        if (product) {
          newItems[index].product_name = product.name;
          newItems[index].unit_price = r2(Number(product.selling_price));
        }
      }

      // Strict-rounded line total
      const item = newItems[index];
      const subtotalLine = r2(Number(item.quantity) * Number(item.unit_price));
      const discount = r2(subtotalLine * (Number(item.discount_percentage) / 100));
      item.total_price = r2(subtotalLine - discount);

      return newItems;
    });
  }, [products]);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const resetItems = useCallback(() => {
    setItems([]);
    setDiscountAmount(0);
    setVatEnabled(initialVatEnabled);
  }, [initialVatEnabled]);

  // ---- Computed totals (with strict rounding) ---------------------------
  const subtotal = useMemo(
    () => r2(items.reduce((sum, item) => sum + Number(item.total_price), 0)),
    [items]
  );

  const totalAfterDiscount = useMemo(
    () => r2(Math.max(0, subtotal - r2(discountAmount))),
    [subtotal, discountAmount]
  );

  const taxAmount = useMemo(
    () => (vatEnabled ? r2(totalAfterDiscount * vatRate) : 0),
    [vatEnabled, totalAfterDiscount, vatRate]
  );

  const grandTotal = useMemo(
    () => r2(totalAfterDiscount + taxAmount),
    [totalAfterDiscount, taxAmount]
  );

  const maxDiscountPercentage = useMemo(() =>
    items.length > 0
      ? Math.max(...items.map(i => Number(i.discount_percentage) || 0))
      : 0,
    [items]
  );

  // ---- Validation -------------------------------------------------------
  const validate = useCallback((): QuotationValidationError[] => {
    const errors: QuotationValidationError[] = [];
    items.forEach((it, idx) => {
      if (!it.product_id) {
        errors.push({ index: idx, field: 'product_id', message: 'يجب اختيار المنتج' });
      }
      if (Number(it.quantity) <= 0) {
        errors.push({ index: idx, field: 'quantity', message: 'الكمية يجب أن تكون أكبر من صفر' });
      }
      const d = Number(it.discount_percentage) || 0;
      if (d < 0) {
        errors.push({ index: idx, field: 'discount_percentage', message: 'الخصم لا يمكن أن يكون سالباً' });
      }
      if (d > 100) {
        errors.push({ index: idx, field: 'discount_percentage', message: 'الخصم لا يمكن أن يتجاوز 100%' });
      }
    });
    return errors;
  }, [items]);

  const prepareItemsForSubmit = useCallback((quotationId: string) => {
    return items.map(item => ({
      quotation_id: quotationId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: r2(item.unit_price),
      discount_percentage: r2(item.discount_percentage),
      total_price: r2(item.total_price),
    }));
  }, [items]);

  return {
    items,
    loadItems,
    addItem,
    updateItem,
    removeItem,
    resetItems,
    setItems,

    // VAT + discount controls
    vatEnabled,
    setVatEnabled,
    vatRate,
    discountAmount,
    setDiscountAmount,

    // Totals
    subtotal,
    totalAfterDiscount,
    taxAmount,
    grandTotal,

    // Helpers
    maxDiscountPercentage,
    prepareItemsForSubmit,
    validate,
    hasItems: items.length > 0,
    hasValidItems: items.every(item => item.product_id !== ''),
  };
}
