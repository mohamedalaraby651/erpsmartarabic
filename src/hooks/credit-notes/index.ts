/**
 * Credit notes hooks — wrap creditNoteRepository draft creation.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  creditNoteRepository,
  type CreateCreditNoteDraftInput,
} from "@/lib/repositories/creditNoteRepository";
import { queryPresets } from "@/lib/queryConfig";

export function useInvoicesForCreditNote(customerId: string, enabled = true) {
  return useQuery({
    queryKey: ["invoices-for-credit", customerId],
    queryFn: () => creditNoteRepository.listInvoicesForCustomer(customerId),
    enabled: enabled && !!customerId,
    ...queryPresets.operational,
  });
}

export function useInvoiceItemsForCredit(invoiceId: string, enabled = true) {
  return useQuery({
    queryKey: ["invoice-items-for-credit", invoiceId],
    queryFn: () => creditNoteRepository.listInvoiceItemsWithProducts(invoiceId),
    enabled: enabled && !!invoiceId,
    ...queryPresets.operational,
  });
}

export function useInvoiceItemReturnsSummary(invoiceId: string, enabled = true) {
  return useQuery({
    queryKey: ["invoice-item-returns-summary", invoiceId],
    queryFn: () => creditNoteRepository.getReturnsSummary(invoiceId),
    enabled: enabled && !!invoiceId,
    ...queryPresets.operational,
  });
}

export function useCreateCreditNoteDraft() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCreditNoteDraftInput) =>
      creditNoteRepository.createDraft(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
    },
  });
}
