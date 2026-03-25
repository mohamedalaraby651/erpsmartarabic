
CREATE TABLE public.customer_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  type TEXT NOT NULL DEFAULT 'other',
  subject TEXT,
  note TEXT NOT NULL,
  communication_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tenant_id UUID REFERENCES public.tenants(id)
);

ALTER TABLE public.customer_communications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read communications"
  ON public.customer_communications FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert communications"
  ON public.customer_communications FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update own communications"
  ON public.customer_communications FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Authenticated users can delete own communications"
  ON public.customer_communications FOR DELETE TO authenticated
  USING (created_by = auth.uid());

CREATE INDEX idx_customer_communications_customer_id ON public.customer_communications(customer_id);
CREATE INDEX idx_customer_communications_date ON public.customer_communications(communication_date DESC);
