-- Create customer_notes table
CREATE TABLE public.customer_notes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view customer notes"
  ON public.customer_notes FOR SELECT
  TO authenticated
  USING (tenant_id = public.get_current_tenant());

CREATE POLICY "Authenticated users can insert customer notes"
  ON public.customer_notes FOR INSERT
  TO authenticated
  WITH CHECK (tenant_id = public.get_current_tenant());

CREATE POLICY "Users can update their own notes"
  ON public.customer_notes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND tenant_id = public.get_current_tenant());

CREATE POLICY "Users can delete their own notes"
  ON public.customer_notes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid() AND tenant_id = public.get_current_tenant());

-- Index for fast lookups
CREATE INDEX idx_customer_notes_customer_id ON public.customer_notes(customer_id);

-- Add recurrence and linked_invoice_id to customer_reminders
ALTER TABLE public.customer_reminders
  ADD COLUMN IF NOT EXISTS recurrence TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS linked_invoice_id UUID REFERENCES public.invoices(id) DEFAULT NULL;