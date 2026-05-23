import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { productRepository } from "@/lib/repositories/productRepository";
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

  const repoFilters = {
    search: debouncedSearch,
    categoryId: categoryFilter,
  };


  const { data: totalCount = 0 } = useQuery({
    queryKey: ['products-count', debouncedSearch, categoryFilter],
    queryFn: async () => {
      const result = await productRepository.findAll(
        filters,
        { key: 'created_at', direction: 'desc' },
        { page: 1, pageSize: 1 },
      );
      return result.count;
    },
  });

  const pagination = useServerPagination({ pageSize: PAGE_SIZE, totalCount });

  const { data: products = [], isLoading, refetch, error } = useQuery({
    queryKey: ['products', debouncedSearch, categoryFilter, pagination.currentPage],
    queryFn: async () => {
      const result = await productRepository.findAll(
        filters,
        { key: 'created_at', direction: 'desc' },
        { page: pagination.currentPage, pageSize: PAGE_SIZE },
      );
      return result.data;
    },
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['product-categories'],
    queryFn: () => productRepository.findCategories(),
  });

  const { data: stockData = [] } = useQuery({
    queryKey: ['product-stock-summary'],
    queryFn: () => productRepository.findStockSummary(),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const hasPermission = await verifyPermissionOnServer('products', 'delete');
      if (!hasPermission) throw new Error('UNAUTHORIZED');
      await productRepository.delete(id);
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
