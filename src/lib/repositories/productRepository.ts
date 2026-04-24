/**
 * Product Repository — Centralized data access for products & variants.
 *
 * Phase 3 (P2) of the Q1 remediation plan: extends the Repository
 * pattern to products so that page components stop calling
 * `supabase.from('products')` directly.
 */
import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';
import { sanitizeSearch } from '@/lib/utils/sanitize';

type Product = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];
type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
type ProductCategory = Database['public']['Tables']['product_categories']['Row'];

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  status?: 'active' | 'inactive' | 'all';
}

export interface ProductSort {
  key: string;
  direction: 'asc' | 'desc' | null;
}

export interface ProductPagination {
  page: number;
  pageSize: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<T extends { or: (...a: any[]) => any; eq: (...a: any[]) => any }>(
  query: T,
  filters: ProductFilters
): T {
  let q = query;
  const { search, categoryId, status } = filters;
  if (search) {
    const s = sanitizeSearch(search);
    q = q.or(`name.ilike.%${s}%,sku.ilike.%${s}%,barcode.ilike.%${s}%`) as typeof q;
  }
  if (categoryId && categoryId !== 'all') q = q.eq('category_id', categoryId) as typeof q;
  if (status && status !== 'all') q = q.eq('is_active', status === 'active') as typeof q;
  return q;
}

export const productRepository = {
  async findAll(
    filters: ProductFilters,
    sort: ProductSort,
    pagination: ProductPagination
  ): Promise<{ data: Product[]; count: number }> {
    const sortColumn = sort.key || 'created_at';
    const sortAsc = sort.direction === 'asc';
    const from = (pagination.page - 1) * pagination.pageSize;
    const to = from + pagination.pageSize - 1;

    let query = supabase
      .from('products')
      .select('*', { count: 'exact' })
      .order(sortColumn, { ascending: sortAsc })
      .range(from, to);

    query = applyFilters(query, filters);

    const { data, count, error } = await query;
    if (error) throw error;
    return { data: (data || []) as Product[], count: count || 0 };
  },

  async findById(id: string): Promise<Product | null> {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async create(payload: ProductInsert): Promise<Product> {
    const { data, error } = await supabase
      .from('products')
      .insert(payload)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async update(id: string, payload: ProductUpdate): Promise<void> {
    const { error } = await supabase.from('products').update(payload).eq('id', id);
    if (error) throw error;
  },

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('products').delete().eq('id', id);
    if (error) throw error;
  },

  async bulkUpdateStatus(ids: string[], isActive: boolean): Promise<void> {
    const { error } = await supabase
      .from('products')
      .update({ is_active: isActive })
      .in('id', ids);
    if (error) throw error;
  },

  async bulkDelete(ids: string[]): Promise<void> {
    const { error } = await supabase.from('products').delete().in('id', ids);
    if (error) throw error;
  },

  // Variants
  async findVariants(productId: string): Promise<ProductVariant[]> {
    const { data, error } = await supabase
      .from('product_variants')
      .select('*')
      .eq('product_id', productId);
    if (error) throw error;
    return (data || []) as ProductVariant[];
  },

  // Categories
  async findCategories(): Promise<ProductCategory[]> {
    const { data, error } = await supabase
      .from('product_categories')
      .select('*')
      .order('name');
    if (error) throw error;
    return (data || []) as ProductCategory[];
  },
};
