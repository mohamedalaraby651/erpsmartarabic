import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useServerPagination } from "@/hooks/useServerPagination";
import { useTableSort } from "@/hooks/useTableSort";
import { useTableFilter } from "@/hooks/useTableFilter";
import { useAuth } from "@/hooks/useAuth";
import { verifyPermissionOnServer } from "@/lib/api/secureOperations";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

export type Product = Database['public']['Tables']['products']['Row'];
export type ProductCategory = Database['public']['Tables']['product_categories']['Row'];

const PAGE_SIZE = 25;

export function useProductsList() {
  const queryClient = useQueryClient();
  const { userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const canEdit = userRole === 'admin' || userRole === 'warehouse';
  const canDelete = userRole === 'admin';

  useEffect(() => {
    const action = searchParams.get('action');
    if (action === 'new' || action === 'create') {
      setDialogOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const { data: totalCount = 0 } = useQuery({
    queryKey: ['products-count', debouncedSearch, categoryFilter],
    queryFn: async () => {
      let query = supabase.from('products').select('*', { count: 'exact', head: true });
      if (debouncedSearch) query = query.or(`name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%`);
      if (categoryFilter !== 'all') query = query.eq('category_id', categoryFilter);
      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
  });

  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });

  const { data: products = [], isLoading, refetch, error } = useQuery({
    queryKey: ['products', debouncedSearch, categoryFilter, pagination.currentPage],
    queryFn: async () => {
      let query = supabase.from('products').select('*')
        .order('created_at', { ascending: false })
        .range(pagination.range.from, pagination.range.to);
      if (debouncedSearch) query = query.or(`name.ilike.%${debouncedSearch}%,sku.ilike.%${debouncedSearch}%`);
      if (categoryFilter !== 'all') query = query.eq('category_id', categoryFilter);
      const { data, error } = await query;
      if (error) throw error;
      return data as Product[];
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_categories').select('*').order('name');
      if (error) throw error;
      return data as ProductCategory[];
    },
  });

  const { data: stockData = [] } = useQuery({
    queryKey: ['product-stock-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.from('product_stock').select('product_id, quantity');
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const hasPermission = await verifyPermissionOnServer('products', 'delete');
      if (!hasPermission) throw new Error('UNAUTHORIZED');
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      toast.success('تم حذف المنتج بنجاح');
      setDeletingId(null);
    },
    onError: (error) => {
      if (error.message === 'UNAUTHORIZED') toast.error('غير مصرح: ليس لديك صلاحية حذف المنتجات');
      else toast.error('فشل حذف المنتج');
      setDeletingId(null);
    },
  });

  const getProductStock = useCallback((productId: string) => {
    return stockData.filter(s => s.product_id === productId).reduce((sum, s) => sum + s.quantity, 0);
  }, [stockData]);

  const getCategoryName = useCallback((categoryId: string | null) => {
    if (!categoryId) return '-';
    return categories.find(c => c.id === categoryId)?.name || '-';
  }, [categories]);

  const { filteredData, filters, setFilter } = useTableFilter(products);
  const { sortedData, sortConfig, requestSort } = useTableSort(filteredData);

  const handleEdit = useCallback((product: Product) => { setSelectedProduct(product); setDialogOpen(true); }, []);
  const handleAdd = useCallback(() => { setSelectedProduct(null); setDialogOpen(true); }, []);
  const handleDelete = useCallback((id: string) => { setDeletingId(id); deleteMutation.mutate(id); }, [deleteMutation]);
  const handleRefresh = useCallback(async () => { await refetch(); }, [refetch]);

  const stats = {
    total: products.length,
    active: products.filter(p => p.is_active).length,
    lowStock: products.filter(p => getProductStock(p.id) <= (p.min_stock || 0)).length,
    categories: categories.length,
  };

  return {
    searchQuery, setSearchQuery, categoryFilter, setCategoryFilter,
    dialogOpen, setDialogOpen, selectedProduct, deletingId,
    importDialogOpen, setImportDialogOpen,
    canEdit, canDelete, products, isLoading, error: error as Error | null, refetch, sortedData, sortConfig, requestSort,
    filters, setFilter, deleteMutation, handleEdit, handleAdd, handleDelete, handleRefresh,
    stats, categories, getProductStock, getCategoryName,
    pagination, totalCount, PAGE_SIZE,
  };
}
