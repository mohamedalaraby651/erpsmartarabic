/**
 * Inventory hooks — wrap `inventoryRepository` with caching + invalidation.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  inventoryRepository,
  type StockMovementFilters,
  type InventoryLevelFilters,
} from "@/lib/repositories/inventoryRepository";
import { queryPresets } from "@/lib/queryConfig";

export function useWarehouses() {
  return useQuery({
    queryKey: ["warehouses"],
    queryFn: () => inventoryRepository.listWarehouses(),
    ...queryPresets.standard,
  });
}

export function useWarehouse(id?: string) {
  return useQuery({
    queryKey: ["warehouse", id],
    queryFn: () => inventoryRepository.getWarehouse(id as string),
    enabled: !!id,
    ...queryPresets.standard,
  });
}

export function useStockMovements(filters: StockMovementFilters = {}) {
  return useQuery({
    queryKey: ["stock_movements", filters],
    queryFn: () => inventoryRepository.listStockMovements(filters),
    ...queryPresets.operational,
  });
}

export function useRecentStockMovements(limit = 10) {
  return useQuery({
    queryKey: ["stock_movements_recent", limit],
    queryFn: () => inventoryRepository.listStockMovements({ limit }),
    ...queryPresets.operational,
  });
}

export function useInventoryLevels(filters: InventoryLevelFilters = {}) {
  return useQuery({
    queryKey: ["product_stock", filters],
    queryFn: () => inventoryRepository.listInventoryLevels(filters),
    ...queryPresets.operational,
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'تم حذف المخزن' },
    mutationFn: (id: string) => inventoryRepository.deleteWarehouse(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses"] });
      qc.invalidateQueries({ queryKey: ["product_stock"] });
      qc.invalidateQueries({ queryKey: ["stock_movements"] });
      qc.invalidateQueries({ queryKey: ["stock_movements_recent"] });
    },
  });
}
