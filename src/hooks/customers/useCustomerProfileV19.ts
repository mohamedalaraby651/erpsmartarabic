import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerRelationsRepo } from "@/lib/repositories/customerRelationsRepo";
import { customerProfileRepository } from "@/lib/repositories/customerProfileRepository";
import { computeProfileMetrics, creditUsePercent } from "@/lib/customers/profileMetrics";

/** Query layer for the v19 profile; shares cache keys with useCustomerDetail. */
export function useCustomerProfileV19(customerId: string | undefined, creditLimit: number | null | undefined) {
  const qc = useQueryClient();
  const enabled = !!customerId;
  const invoicesQ = useQuery({ queryKey: ['customer-invoices', customerId], queryFn: () => customerRelationsRepo.findInvoices(customerId!), enabled, staleTime: 60000 });
  const paymentsQ = useQuery({ queryKey: ['customer-payments', customerId], queryFn: () => customerRelationsRepo.findPayments(customerId!), enabled, staleTime: 60000 });
  const creditNotesQ = useQuery({ queryKey: ['customer-credit-notes', customerId], queryFn: () => customerRelationsRepo.findCreditNotes(customerId!), enabled, staleTime: 60000 });
  const ordersQ = useQuery({ queryKey: ['customer-sales-orders', customerId], queryFn: () => customerRelationsRepo.findSalesOrders(customerId!), enabled, staleTime: 60000 });
  const contactsQ = useQuery({ queryKey: ['customer-contacts', customerId], queryFn: () => customerProfileRepository.listContacts(customerId!), enabled });
  const promisesQ = useQuery({ queryKey: ['payment-promises', customerId], queryFn: () => customerProfileRepository.listPromises(customerId!), enabled });

  const invoices = invoicesQ.data ?? [];
  const payments = paymentsQ.data ?? [];
  const metrics = useMemo(() => computeProfileMetrics(invoices), [invoices]);
  const creditUse = creditUsePercent(metrics.outstanding, creditLimit);
  const lastPayment = payments[0] ?? null;

  const addContact = useMutation({
    mutationFn: customerProfileRepository.addContact,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['customer-contacts', customerId] }),
  });
  const addPromise = useMutation({
    mutationFn: customerProfileRepository.addPromise,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-promises', customerId] }),
  });
  const setPromiseStatus = useMutation({
    mutationFn: (a: { id: string; status: 'kept' | 'broken' | 'cancelled' }) => customerProfileRepository.setPromiseStatus(a.id, a.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['payment-promises', customerId] }),
  });

  return {
    invoices, payments, creditNotes: creditNotesQ.data ?? [], salesOrders: ordersQ.data ?? [],
    contacts: contactsQ.data ?? [], promises: promisesQ.data ?? [],
    activePromise: (promisesQ.data ?? []).find((p) => p.status === 'pending') ?? null,
    metrics, creditUse, lastPayment, loading: invoicesQ.isLoading,
    addContact, addPromise, setPromiseStatus,
  };
}
export type CustomerProfileV19 = ReturnType<typeof useCustomerProfileV19>;
