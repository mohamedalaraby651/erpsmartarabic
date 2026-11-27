ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS code text;
CREATE UNIQUE INDEX IF NOT EXISTS customers_tenant_code_uidx ON public.customers (tenant_id, code) WHERE code IS NOT NULL;
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES public.warehouses(id);
CREATE INDEX IF NOT EXISTS invoices_warehouse_id_idx ON public.invoices (warehouse_id);

CREATE TABLE public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.get_current_tenant() REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  name text NOT NULL,
  role text,
  phone text,
  email text,
  is_primary boolean NOT NULL DEFAULT false,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.customer_contacts TO authenticated;
GRANT ALL ON public.customer_contacts TO service_role;
ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
CREATE INDEX customer_contacts_tenant_customer_idx ON public.customer_contacts (tenant_id, customer_id);
CREATE INDEX customer_contacts_customer_idx ON public.customer_contacts (customer_id);

CREATE POLICY customer_contacts_select ON public.customer_contacts FOR SELECT TO authenticated
  USING (tenant_id = (select public.get_current_tenant()) AND (select public.is_tenant_member((select auth.uid()), public.get_current_tenant())));
CREATE POLICY customer_contacts_insert ON public.customer_contacts FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (select public.get_current_tenant()) AND (select public.is_tenant_member((select auth.uid()), public.get_current_tenant()))
    AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = customer_contacts.tenant_id));
CREATE POLICY customer_contacts_update ON public.customer_contacts FOR UPDATE TO authenticated
  USING (tenant_id = (select public.get_current_tenant()) AND (select public.is_tenant_member((select auth.uid()), public.get_current_tenant())))
  WITH CHECK (tenant_id = (select public.get_current_tenant())
    AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = customer_contacts.tenant_id));

CREATE TABLE public.payment_promises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.get_current_tenant() REFERENCES public.tenants(id),
  customer_id uuid NOT NULL REFERENCES public.customers(id),
  invoice_id uuid REFERENCES public.invoices(id),
  promised_date date NOT NULL,
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','kept','broken','cancelled')),
  notes text,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.payment_promises TO authenticated;
GRANT ALL ON public.payment_promises TO service_role;
ALTER TABLE public.payment_promises ENABLE ROW LEVEL SECURITY;
CREATE INDEX payment_promises_tenant_customer_idx ON public.payment_promises (tenant_id, customer_id, created_at DESC);
CREATE INDEX payment_promises_customer_idx ON public.payment_promises (customer_id);
CREATE INDEX payment_promises_invoice_idx ON public.payment_promises (invoice_id);

CREATE POLICY payment_promises_select ON public.payment_promises FOR SELECT TO authenticated
  USING (tenant_id = (select public.get_current_tenant()) AND (select public.is_tenant_member((select auth.uid()), public.get_current_tenant())));
CREATE POLICY payment_promises_insert ON public.payment_promises FOR INSERT TO authenticated
  WITH CHECK (tenant_id = (select public.get_current_tenant()) AND (select public.is_tenant_member((select auth.uid()), public.get_current_tenant()))
    AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = payment_promises.tenant_id)
    AND (invoice_id IS NULL OR EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.tenant_id = payment_promises.tenant_id AND i.customer_id = payment_promises.customer_id)));
CREATE POLICY payment_promises_update ON public.payment_promises FOR UPDATE TO authenticated
  USING (tenant_id = (select public.get_current_tenant()) AND (select public.is_tenant_member((select auth.uid()), public.get_current_tenant())))
  WITH CHECK (tenant_id = (select public.get_current_tenant())
    AND EXISTS (SELECT 1 FROM public.customers c WHERE c.id = customer_id AND c.tenant_id = payment_promises.tenant_id));