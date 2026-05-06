-- Recreate the view with security_invoker so RLS of caller is enforced
DROP VIEW IF EXISTS public.invoice_item_returns_summary;

CREATE VIEW public.invoice_item_returns_summary
WITH (security_invoker = true) AS
SELECT
  ii.id                                              AS invoice_item_id,
  ii.invoice_id,
  ii.product_id,
  ii.quantity                                        AS original_qty,
  ii.unit_price                                      AS unit_price_current,
  COALESCE(SUM(cni.quantity) FILTER (WHERE cn.status = 'confirmed'), 0)
                                                     AS confirmed_returned_qty,
  COALESCE(SUM(cni.quantity) FILTER (WHERE cn.status = 'draft'), 0)
                                                     AS draft_returned_qty,
  GREATEST(
    0,
    ii.quantity - COALESCE(SUM(cni.quantity) FILTER (WHERE cn.status = 'confirmed'), 0)
  )                                                  AS remaining_qty,
  COUNT(DISTINCT cn.id) FILTER (WHERE cn.status = 'confirmed')
                                                     AS confirmed_credit_notes_count,
  COUNT(DISTINCT cn.id) FILTER (WHERE cn.status = 'draft')
                                                     AS draft_credit_notes_count
FROM public.invoice_items ii
LEFT JOIN public.credit_note_items cni ON cni.invoice_item_id = ii.id
LEFT JOIN public.credit_notes cn       ON cn.id = cni.credit_note_id
GROUP BY ii.id, ii.invoice_id, ii.product_id, ii.quantity, ii.unit_price;

COMMENT ON VIEW public.invoice_item_returns_summary IS
'Aggregated return progress per invoice line. Uses security_invoker=true to honor caller RLS.';