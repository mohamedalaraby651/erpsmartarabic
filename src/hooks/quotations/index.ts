/**
 * Quotations hooks — wrap legacyQuotationsRepository + quotationRepository
 * pipeline reads with cache presets.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { quotationRepository } from "@/lib/repositories/quotationRepository";
import {
  legacyQuotationsRepository,
  type LegacyQuotationItemInputPayload,
  type LegacyQuotationHeaderPayload,
} from "@/lib/repositories/legacyQuotationsRepository";
import { queryPresets } from "@/lib/queryConfig";

export function usePipelineOrders(enabled = true) {
  return useQuery({
    queryKey: ["pipeline-orders"],
    queryFn: () => quotationRepository.listPipelineOrders(),
    enabled,
    ...queryPresets.operational,
  });
}

export function usePipelineInvoices(enabled = true) {
  return useQuery({
    queryKey: ["pipeline-invoices"],
    queryFn: () => quotationRepository.listPipelineInvoices(),
    enabled,
    ...queryPresets.operational,
  });
}

export function useSaveLegacyQuotation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (params: {
      id?: string | null;
      header: LegacyQuotationHeaderPayload;
      items: LegacyQuotationItemInputPayload[];
    }) =>
      params.id
        ? legacyQuotationsRepository.updateWithItems(params.id, params.header, params.items)
        : legacyQuotationsRepository
            .create(params.header, params.items)
            .then((r) => r.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}
