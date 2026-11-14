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
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useInvoiceItemsForCredit(invoiceId: string, enabled = true) {
  return useQuery({
    queryKey: ["invoice-items-for-credit", invoiceId],
    queryFn: () => creditNoteRepository.listInvoiceItemsWithProducts(invoiceId),
    enabled: enabled && !!invoiceId,
    ...queryPresets.operational,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useInvoiceItemReturnsSummary(invoiceId: string, enabled = true) {
  return useQuery({
    queryKey: ["invoice-item-returns-summary", invoiceId],
    queryFn: () => creditNoteRepository.getReturnsSummary(invoiceId),
    enabled: enabled && !!invoiceId,
    ...queryPresets.operational,
    staleTime: 0,
    refetchOnMount: 'always',
  });
}

export function useCreateCreditNoteDraft() {
  const qc = useQueryClient();
  return useMutation({
    meta: { successMessage: 'تم حفظ مسودة إشعار الدائن' },
    mutationFn: (input: CreateCreditNoteDraftInput) =>
      creditNoteRepository.createDraft(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["credit-notes"] });
    },
  });
}

/** Restoration invalidates cached authority; the UI must wait for fresh reads. */
export function useRefreshCreditNoteReferences() {
  const qc = useQueryClient();
  return (customerId: string, invoiceId: string) => Promise.all([
    qc.invalidateQueries({ queryKey: ['invoices-for-credit', customerId], exact: true }),
    qc.invalidateQueries({ queryKey: ['invoice-items-for-credit', invoiceId], exact: true }),
    qc.invalidateQueries({ queryKey: ['invoice-item-returns-summary', invoiceId], exact: true }),
  ]);
}
