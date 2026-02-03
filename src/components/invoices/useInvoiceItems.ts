import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Product = Database['public']['Tables']['products']['Row'];

export interface InvoiceItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  total_price: number;
}

export function useInvoiceItems(products: Product[]) {
  const [items, setItems] = useState<InvoiceItem[]>([]);

  const loadItems = useCallback(async (invoiceId: string) => {
    const { data, error } = await supabase
      .from('invoice_items')
      .select('*, products(name)')
      .eq('invoice_id', invoiceId);
    
    if (!error && data) {
      setItems(data.map((item) => ({
        product_id: item.product_id,
        product_name: (item as { products?: { name: string } }).products?.name || '',
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

  const updateItem = useCallback((index: number, field: keyof InvoiceItem, value: string | number) => {
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

  const subtotal = items.reduce((sum, item) => sum + item.total_price, 0);

  return {
    items,
    subtotal,
    addItem,
    updateItem,
    removeItem,
    loadItems,
    resetItems,
  };
}
