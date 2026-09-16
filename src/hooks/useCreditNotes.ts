/**
 * useCreditNotes — Hooks موحّدة للوصول لجدول المرتجعات عبر creditNoteRepository.
 * لا يُسمح لأي مكوّن UI باستيراد supabase مباشرة للوصول إلى المرتجعات.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  creditNoteRepository,
  type CreditNoteFilters,
  type CreditNoteListResult,
} from "@/lib/repositories/creditNoteRepository";

const KEYS = {
  all: ["credit-notes"] as const,
  list: (filters: CreditNoteFilters, page: number) =>
    ["credit-notes", "list", filters, page] as const,
  count: (filters: CreditNoteFilters) => ["credit-notes", "count", filters] as const,
  detail: (id: string) => ["credit-note", id] as const,
  items: (id: string) => ["credit-note-items", id] as const,
  journal: (id: string) => ["credit-note-journal", id] as const,
};

export function useCreditNotesCount(filters: CreditNoteFilters) {
  return useQuery({
    queryKey: KEYS.count(filters),
    queryFn: () => creditNoteRepository.count(filters),
  });
}

export function useCreditNotesList(filters: CreditNoteFilters, page: number, pageSize: number) {
  return useQuery<CreditNoteListResult>({
    queryKey: KEYS.list(filters, page),
    queryFn: () => creditNoteRepository.list({ filters, page, pageSize }),
  });
}

export function useCreditNoteDetail(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.detail(id ?? ""),
    queryFn: () => creditNoteRepository.findById(id!),
    enabled: !!id,
  });
}

export function useCreditNoteItems(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.items(id ?? ""),
    queryFn: () => creditNoteRepository.listItems(id!),
    enabled: !!id,
  });
}

export function useCreditNoteJournal(id: string | undefined) {
  return useQuery({
    queryKey: KEYS.journal(id ?? ""),
    queryFn: () => creditNoteRepository.findJournal(id!),
    enabled: !!id,
  });
}

function useInvalidateAll(id?: string) {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEYS.all });
    if (id) {
      qc.invalidateQueries({ queryKey: KEYS.detail(id) });
      qc.invalidateQueries({ queryKey: KEYS.journal(id) });
    }
    qc.invalidateQueries({ queryKey: ["invoices"] });
    qc.invalidateQueries({ queryKey: ["customers"] });
  };
}

export function useConfirmCreditNote(id?: string) {
  const invalidate = useInvalidateAll(id);
  return useMutation({
    meta: { successMessage: 'تم اعتماد إشعار الدائن' },
    mutationFn: (cnId: string) => creditNoteRepository.confirm(cnId),
    onSuccess: invalidate,
  });
}

export function useCancelCreditNote(id?: string) {
  const invalidate = useInvalidateAll(id);
  return useMutation({
    meta: { successMessage: 'تم إلغاء إشعار الدائن' },
    mutationFn: (cnId: string) => creditNoteRepository.cancel(cnId),
    onSuccess: invalidate,
  });
}
