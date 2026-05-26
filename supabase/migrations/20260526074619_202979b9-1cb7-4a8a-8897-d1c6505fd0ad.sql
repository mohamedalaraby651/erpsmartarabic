CREATE INDEX IF NOT EXISTS idx_credit_note_items_credit_note
  ON public.credit_note_items (credit_note_id);

CREATE INDEX IF NOT EXISTS idx_quote_items_tenant
  ON public.quote_items (tenant_id);