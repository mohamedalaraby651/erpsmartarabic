-- FIN-OBS-001 remediation (authorized): reconcile paid_amount/payment_status
-- for the three named invoices whose recorded payments were not reflected.
-- Data-only. No ledger posting, no payment mutation, no journal changes.
DO $$
DECLARE
  v_ids uuid[] := ARRAY[
    'e1000001-0000-0000-0000-000000000006',
    'e1000001-0000-0000-0000-000000000008',
    'e1000001-0000-0000-0000-000000000013'
  ]::uuid[];
BEGIN
  UPDATE public.invoices i
  SET paid_amount = s.paid,
      payment_status = CASE
        WHEN s.paid <= 0 THEN 'pending'::payment_status
        WHEN s.paid >= i.total_amount THEN 'paid'::payment_status
        ELSE 'partial'::payment_status
      END,
      updated_at = now()
  FROM (
    SELECT p.invoice_id, ROUND(COALESCE(SUM(p.amount),0) * 100) / 100 AS paid
    FROM public.payments p
    WHERE p.invoice_id = ANY(v_ids)
    GROUP BY p.invoice_id
  ) s
  WHERE i.id = s.invoice_id
    AND i.id = ANY(v_ids)
    AND COALESCE(i.paid_amount, 0) <> s.paid;
END $$;