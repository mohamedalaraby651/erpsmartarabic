/**
 * useFiscalPeriods — React Query hooks for fiscal periods.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fiscalPeriodRepository,
  type FiscalPeriodInsert,
} from "@/lib/repositories/fiscalPeriodRepository";
import { queryPresets } from "@/lib/queryConfig";
import { getSafeErrorMessage, logErrorSafely } from "@/lib/errorHandler";

export function useFiscalPeriods() {
  return useQuery({
    queryKey: ["fiscal-periods"],
    queryFn: () => fiscalPeriodRepository.listPeriods(),
    ...queryPresets.reference,
  });
}

export function useCurrentFiscalPeriod() {
  return useQuery({
    queryKey: ["fiscal-periods", "current"],
    queryFn: () => fiscalPeriodRepository.getCurrent(),
    ...queryPresets.reference,
  });
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ["fiscal-periods"] });
  qc.invalidateQueries({ queryKey: ["journals"] });
}

export function useCreateFiscalPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: FiscalPeriodInsert) => fiscalPeriodRepository.createPeriod(payload),
    onSuccess: () => {
      invalidate(qc);
      toast.success("تم إنشاء الفترة المالية");
    },
    onError: (err) => {
      logErrorSafely("useCreateFiscalPeriod", err);
      toast.error(getSafeErrorMessage(err));
    },
  });
}

export function useOpenFiscalPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fiscalPeriodRepository.openPeriod(id),
    onSuccess: () => {
      invalidate(qc);
      toast.success("تم فتح الفترة المالية");
    },
    onError: (err) => {
      logErrorSafely("useOpenFiscalPeriod", err);
      toast.error(getSafeErrorMessage(err));
    },
  });
}

export function useCloseFiscalPeriod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fiscalPeriodRepository.closePeriod(id),
    onSuccess: () => {
      invalidate(qc);
      toast.success("تم إغلاق الفترة المالية");
    },
    onError: (err) => {
      logErrorSafely("useCloseFiscalPeriod", err);
      toast.error(getSafeErrorMessage(err));
    },
  });
}
