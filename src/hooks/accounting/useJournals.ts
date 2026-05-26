/**
 * useJournals — React Query hooks for journal listings, details, creation,
 * posting, and reversal. All accounting pages consume these.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  journalRepository,
  type JournalFilters,
  type JournalHeaderInput,
  type JournalLineInput,
} from "@/lib/repositories/journalRepository";
import { queryPresets } from "@/lib/queryConfig";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";

export function useJournalsList(filters: JournalFilters = {}) {
  return useQuery({
    queryKey: ["journals", filters],
    queryFn: () => journalRepository.listJournals(filters),
    ...queryPresets.operational,
  });
}

export function useJournal(id: string | null | undefined) {
  return useQuery({
    queryKey: ["journals", "detail", id],
    queryFn: () => journalRepository.getJournal(id!),
    enabled: !!id,
    ...queryPresets.operational,
  });
}

export function useJournalEntries(journalId: string | null | undefined) {
  return useQuery({
    queryKey: ["journal-entries", journalId],
    queryFn: () => journalRepository.getEntries(journalId!),
    enabled: !!journalId,
    ...queryPresets.operational,
  });
}

function invalidateJournals(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["journals"] });
  qc.invalidateQueries({ queryKey: ["journal-entries"] });
  qc.invalidateQueries({ queryKey: ["chart-of-accounts"] });
  qc.invalidateQueries({ queryKey: ["document-posting-log"] });
}

export function useCreateManualJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { header: JournalHeaderInput; lines: JournalLineInput[] }) =>
      journalRepository.createManualJournal(vars.header, vars.lines),
    onSuccess: () => {
      invalidateJournals(qc);
      toast.success("تم إنشاء القيد بنجاح");
    },
    onError: (err) => {
      logErrorSafely("useCreateManualJournal", err);
      toast.error(getSafeErrorMessage(err));
    },
  });
}

export function usePostJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => journalRepository.postJournal(id),
    onSuccess: () => {
      invalidateJournals(qc);
      toast.success("تم ترحيل القيد بنجاح");
    },
    onError: (err) => {
      logErrorSafely("usePostJournal", err);
      toast.error(getSafeErrorMessage(err));
    },
  });
}

export function useReverseJournal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason: string }) =>
      journalRepository.reverseJournal(vars.id, vars.reason),
    onSuccess: () => {
      invalidateJournals(qc);
      toast.success("تم إنشاء قيد العكس (مسودة)");
    },
    onError: (err) => {
      logErrorSafely("useReverseJournal", err);
      toast.error(getSafeErrorMessage(err));
    },
  });
}
