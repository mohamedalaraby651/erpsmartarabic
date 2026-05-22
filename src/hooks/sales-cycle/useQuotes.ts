/**
 * Sales-cycle quotes hooks — thin wrappers over `quotationRepository`.
 *
 * UI components must depend on these hooks (or the repository directly),
 * never on `supabase.from('quotes')`. This file used to embed the full
 * data access; the body now delegates to the repository as part of the
 * Repository Boundary Enforcement phase.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getSafeErrorMessage } from "@/lib/errorHandler";
import {
  quotationRepository,
  type QuotationDraft,
  type QuotationFilters,
  type QuotationItemInput,
  type QuotationItemRow,
  type QuotationRow,
  type QuotationStatus,
} from "@/lib/repositories/quotationRepository";

export type QuoteStatus = QuotationStatus;
export type QuoteRow = QuotationRow;
export type QuoteItemInput = QuotationItemInput;
export type QuoteDraft = QuotationDraft;
export type QuoteItemRow = QuotationItemRow;

export function useQuotesList(search = "", extra: Omit<QuotationFilters, "search"> = {}) {
  return useQuery({
    queryKey: ["quotes", { search, ...extra }],
    queryFn: async () => {
      const { data } = await quotationRepository.list({ search, ...extra });
      return data;
    },
  });
}

export function useQuoteDetails(id: string | undefined) {
  const header = useQuery({
    queryKey: ["quote", id],
    enabled: !!id,
    queryFn: () => quotationRepository.findById(id!),
  });

  const items = useQuery({
    queryKey: ["quote-items", id],
    enabled: !!id,
    queryFn: () => quotationRepository.listItems(id!),
  });

  return { header, items };
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (draft: QuoteDraft) => quotationRepository.create(draft),
    onSuccess: (h) => {
      toast.success(`تم إنشاء عرض السعر ${h.quote_number}`);
      qc.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "تعذّر إنشاء عرض السعر"),
  });
}

export function useUpdateQuoteStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: QuoteStatus }) =>
      quotationRepository.updateStatus(id, status),
    onSuccess: () => {
      toast.success("تم تحديث حالة العرض");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["quote"] });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "تعذّر التحديث"),
  });
}

export function useConvertQuoteToOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (quoteId: string) => quotationRepository.convertToOrder(quoteId),
    onSuccess: () => {
      toast.success("تم تحويل عرض السعر إلى أمر بيع");
      qc.invalidateQueries({ queryKey: ["quotes"] });
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "فشل التحويل"),
  });
}

export function useConvertOrderToInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (orderId: string) => quotationRepository.convertOrderToInvoice(orderId),
    onSuccess: () => {
      toast.success("تم إنشاء فاتورة المبيعات");
      qc.invalidateQueries({ queryKey: ["sales-orders"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "فشل إنشاء الفاتورة"),
  });
}

export function useConvertInvoiceToDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      invoiceId,
      warehouseId,
    }: {
      invoiceId: string;
      warehouseId?: string | null;
    }) => quotationRepository.convertInvoiceToDelivery(invoiceId, warehouseId ?? null),
    onSuccess: () => {
      toast.success("تم إنشاء إذن التسليم");
      qc.invalidateQueries({ queryKey: ["invoices"] });
      qc.invalidateQueries({ queryKey: ["delivery-notes"] });
    },
    onError: (e) => toast.error(getSafeErrorMessage(e) || "فشل إنشاء إذن التسليم"),
  });
}
