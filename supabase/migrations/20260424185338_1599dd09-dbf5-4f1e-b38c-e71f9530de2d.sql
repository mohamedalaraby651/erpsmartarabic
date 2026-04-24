-- Re-queue invoice.approved events for invoices that still have no journal
UPDATE public.domain_events de
SET status = 'pending',
    processed_at = NULL,
    last_error = NULL,
    attempts = 0
WHERE de.event_type = 'invoice.approved'
  AND de.status = 'processed'
  AND NOT EXISTS (
    SELECT 1 FROM public.journals j
    WHERE j.source_type = 'invoice' AND j.source_id = de.aggregate_id
  );

-- Re-queue payment.received events for payments that still have no journal
UPDATE public.domain_events de
SET status = 'pending',
    processed_at = NULL,
    last_error = NULL,
    attempts = 0
WHERE de.event_type = 'payment.received'
  AND de.status = 'processed'
  AND NOT EXISTS (
    SELECT 1 FROM public.journals j
    WHERE j.source_type = 'payment' AND j.source_id = de.aggregate_id
  );