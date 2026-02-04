import { useState, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
}

export function useQuotationItems({ products }: UseQuotationItemsProps) {
  const [items, setItems] = useState<QuotationItem[]>([]);

  const loadItems = useCallback(async (quotationId: string) => {
    const { data, error } = await supabase
      .from('quotation_items')
      .select('*, products(name)')
      .eq('quotation_id', quotationId);
    
    if (!error && data) {
      type LoadedItem = {
        product_id: string;
        quantity: number;
        unit_price: number;
        discount_percentage: number | null;
        total_price: number;
        products: { name: string } | null;
      };
      setItems((data as LoadedItem[]).map((item) => ({
        product_id: item.product_id,
        product_name: item.products?.name || '',
        quantity: item.quantity,
        unit_price: Number(item.unit_price),
        discount_percentage: Number(item.discount_percentage) || 0,
        total_price: Number(item.total_price),
      })));
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
          newItems[index].unit_price = Number(product.selling_price);
        }
      }
      
      // Recalculate total
      const item = newItems[index];
      const subtotal = item.quantity * item.unit_price;
      const discount = subtotal * (item.discount_percentage / 100);
      item.total_price = subtotal - discount;
      
      return newItems;
    });
  }, [products]);

  const removeItem = useCallback((index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const resetItems = useCallback(() => {
    setItems([]);
  }, []);

  const subtotal = useMemo(() => 
    items.reduce((sum, item) => sum + item.total_price, 0),
    [items]
  );

  const maxDiscountPercentage = useMemo(() => 
    items.length > 0 
      ? Math.max(...items.map(i => i.discount_percentage || 0))
      : 0,
    [items]
  );

  const prepareItemsForSubmit = useCallback((quotationId: string) => {
    return items.map(item => ({
      quotation_id: quotationId,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      discount_percentage: item.discount_percentage,
      total_price: item.total_price,
    }));
  }, [items]);

  return {
    items,
    loadItems,
    addItem,
    updateItem,
    removeItem,
    resetItems,
    subtotal,
    maxDiscountPercentage,
    prepareItemsForSubmit,
    hasItems: items.length > 0,
    hasValidItems: items.every(item => item.product_id !== ''),
  };
}
