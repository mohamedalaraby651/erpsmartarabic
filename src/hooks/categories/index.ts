/**
 * Category hooks — wrap categoryRepository with caching + invalidation.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { categoryRepository } from "@/lib/repositories/categoryRepository";
import type { Database } from "@/integrations/supabase/types";
import { queryPresets } from "@/lib/queryConfig";

type Insert = Database["public"]["Tables"]["product_categories"]["Insert"];
type Update = Database["public"]["Tables"]["product_categories"]["Update"];

export function useCategories() {
  return useQuery({
    queryKey: ["product-categories"],
    queryFn: () => categoryRepository.list(),
    ...queryPresets.reference,
  });
}

export function useCategoryTree() {
  return useQuery({
    queryKey: ["product-categories", "tree"],
    queryFn: () => categoryRepository.tree(),
    ...queryPresets.reference,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["product-categories"] });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Insert) => categoryRepository.create(payload),
    onSuccess: () => invalidate(qc),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Update }) =>
      categoryRepository.update(id, payload),
    onSuccess: () => invalidate(qc),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => categoryRepository.delete(id),
    onSuccess: () => invalidate(qc),
  });
}
