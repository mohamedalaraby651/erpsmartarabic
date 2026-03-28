
-- Credit Notes table
CREATE TABLE public.credit_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_number TEXT NOT NULL,
  invoice_id UUID REFERENCES public.invoices(id) NOT NULL,
  customer_id UUID REFERENCES public.customers(id) NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'confirmed', 'cancelled')),
  created_by UUID,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Credit Note Items table
CREATE TABLE public.credit_note_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_note_id UUID REFERENCES public.credit_notes(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  variant_id UUID REFERENCES public.product_variants(id),
  quantity NUMERIC NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  total_price NUMERIC NOT NULL DEFAULT 0,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Sequence for credit note numbers
CREATE SEQUENCE IF NOT EXISTS credit_note_seq START 1;

-- Auto-generate credit note number
CREATE OR REPLACE FUNCTION public.generate_credit_note_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.credit_note_number IS NULL OR NEW.credit_note_number = '' THEN
    NEW.credit_note_number := 'CN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('credit_note_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_credit_note_number
  BEFORE INSERT ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION generate_credit_note_number();

-- Auto-update updated_at
CREATE TRIGGER update_credit_notes_updated_at
  BEFORE UPDATE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger
CREATE TRIGGER audit_credit_notes
  AFTER INSERT OR UPDATE OR DELETE ON public.credit_notes
  FOR EACH ROW EXECUTE FUNCTION log_activity();

-- Enable RLS
ALTER TABLE public.credit_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_note_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for credit_notes
CREATE POLICY "Authenticated users can view credit_notes"
  ON public.credit_notes FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());

CREATE POLICY "Authenticated users can insert credit_notes"
  ON public.credit_notes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant());

CREATE POLICY "Authenticated users can update credit_notes"
  ON public.credit_notes FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant());

CREATE POLICY "Authenticated users can delete credit_notes"
  ON public.credit_notes FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant());

-- RLS Policies for credit_note_items
CREATE POLICY "Authenticated users can view credit_note_items"
  ON public.credit_note_items FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());

CREATE POLICY "Authenticated users can insert credit_note_items"
  ON public.credit_note_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant());

CREATE POLICY "Authenticated users can update credit_note_items"
  ON public.credit_note_items FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant());

CREATE POLICY "Authenticated users can delete credit_note_items"
  ON public.credit_note_items FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant());
