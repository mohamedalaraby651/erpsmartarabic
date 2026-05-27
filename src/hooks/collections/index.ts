/**
 * Collections hooks — wrap collectionRepository with caching.
 */
import { useQuery } from "@tanstack/react-query";
import { collectionRepository } from "@/lib/repositories/collectionRepository";
import { queryPresets } from "@/lib/queryConfig";

export function useCollectionInvoices() {
  return useQuery({
    queryKey: ["collection-invoices"],
    queryFn: () => collectionRepository.listUnpaidInvoices(),
    ...queryPresets.operational,
  });
}
