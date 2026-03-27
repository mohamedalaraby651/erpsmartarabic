
-- Stats RPC for aggregated customer statistics
CREATE OR REPLACE FUNCTION public.get_customer_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'individuals', COUNT(*) FILTER (WHERE customer_type = 'individual'),
    'companies', COUNT(*) FILTER (WHERE customer_type = 'company'),
    'farms', COUNT(*) FILTER (WHERE customer_type = 'farm'),
    'vip', COUNT(*) FILTER (WHERE vip_level != 'regular'),
    'active', COUNT(*) FILTER (WHERE is_active = true),
    'inactive', COUNT(*) FILTER (WHERE is_active = false),
    'total_balance', COALESCE(SUM(current_balance), 0)
  )
  FROM customers
$$;

-- Customer reminders table
CREATE TABLE public.customer_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  reminder_date TIMESTAMPTZ NOT NULL,
  note TEXT NOT NULL,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage reminders"
  ON public.customer_reminders
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_customer_reminders_customer ON public.customer_reminders(customer_id);
CREATE INDEX idx_customer_reminders_date ON public.customer_reminders(reminder_date) WHERE NOT is_completed;
