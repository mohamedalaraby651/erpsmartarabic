-- LAYER 4: SALES CYCLE
DO $$ BEGIN
  CREATE TYPE public.quote_status AS ENUM ('draft','sent','accepted','rejected','expired','converted');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT public.get_current_tenant(),
  quote_number TEXT NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.customers(id),
  quote_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status public.quote_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(14,2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  converted_order_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, quote_number)
);

CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL DEFAULT public.get_current_tenant(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  variant_id UUID REFERENCES public.product_variants(id),
  quantity NUMERIC(14,3) NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(14,2) NOT NULL CHECK (unit_price >= 0),
  discount_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_price NUMERIC(14,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quotes_tenant_status ON public.quotes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON public.quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON public.quote_items(quote_id);

-- Auto-numbering
CREATE OR REPLACE FUNCTION public.gen_quote_number()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE seq INT;
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    SELECT COALESCE(MAX(NULLIF(regexp_replace(quote_number,'\D','','g'),'')::INT),0)+1
      INTO seq FROM public.quotes WHERE tenant_id = NEW.tenant_id;
    NEW.quote_number := 'QT-' || to_char(now(),'YYYY') || '-' || lpad(seq::text,5,'0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_quotes_number ON public.quotes;
CREATE TRIGGER trg_quotes_number BEFORE INSERT ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.gen_quote_number();

DROP TRIGGER IF EXISTS trg_quotes_updated ON public.quotes;
CREATE TRIGGER trg_quotes_updated BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_quotes_select" ON public.quotes;
CREATE POLICY "tenant_quotes_select" ON public.quotes FOR SELECT
  USING (tenant_id = public.get_current_tenant());
DROP POLICY IF EXISTS "tenant_quotes_insert" ON public.quotes;
CREATE POLICY "tenant_quotes_insert" ON public.quotes FOR INSERT
  WITH CHECK (tenant_id = public.get_current_tenant());
DROP POLICY IF EXISTS "tenant_quotes_update" ON public.quotes;
CREATE POLICY "tenant_quotes_update" ON public.quotes FOR UPDATE
  USING (tenant_id = public.get_current_tenant());
DROP POLICY IF EXISTS "tenant_quotes_delete" ON public.quotes;
CREATE POLICY "tenant_quotes_delete" ON public.quotes FOR DELETE
  USING (tenant_id = public.get_current_tenant() AND status = 'draft');

DROP POLICY IF EXISTS "tenant_qitems_all" ON public.quote_items;
CREATE POLICY "tenant_qitems_all" ON public.quote_items FOR ALL
  USING (tenant_id = public.get_current_tenant())
  WITH CHECK (tenant_id = public.get_current_tenant());

-- CONVERT QUOTE → ORDER
CREATE OR REPLACE FUNCTION public.convert_quote_to_order(p_quote_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tenant UUID; v_quote RECORD; v_order_id UUID; v_order_no TEXT;
BEGIN
  v_tenant := public.get_current_tenant();
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Quote not found'; END IF;
  IF v_quote.status = 'converted' THEN RAISE EXCEPTION 'Quote already converted'; END IF;
  IF v_quote.status NOT IN ('accepted','sent') THEN RAISE EXCEPTION 'Only accepted/sent quotes can be converted'; END IF;
  IF v_quote.valid_until < CURRENT_DATE THEN RAISE EXCEPTION 'Quote expired'; END IF;

  v_order_no := 'SO-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6);

  INSERT INTO public.sales_orders (tenant_id, order_number, customer_id, order_date, status, subtotal, discount_amount, tax_amount, total_amount, notes, created_by)
  VALUES (v_tenant, v_order_no, v_quote.customer_id, CURRENT_DATE, 'pending', v_quote.subtotal, v_quote.discount_amount, v_quote.tax_amount, v_quote.total_amount, v_quote.notes, auth.uid())
  RETURNING id INTO v_order_id;

  INSERT INTO public.sales_order_items (tenant_id, order_id, product_id, variant_id, quantity, unit_price, discount_percentage, total_price, notes)
  SELECT v_tenant, v_order_id, product_id, variant_id, quantity::INT, unit_price, discount_percentage, total_price, notes
  FROM public.quote_items WHERE quote_id = p_quote_id;

  UPDATE public.quotes SET status = 'converted', converted_order_id = v_order_id WHERE id = p_quote_id;
  RETURN v_order_id;
END $$;

-- CONVERT ORDER → INVOICE
CREATE OR REPLACE FUNCTION public.convert_order_to_invoice(p_order_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tenant UUID; v_order RECORD; v_inv_id UUID; v_inv_no TEXT; v_existing UUID;
BEGIN
  v_tenant := public.get_current_tenant();
  SELECT * INTO v_order FROM public.sales_orders WHERE id = p_order_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Order not found'; END IF;

  SELECT id INTO v_existing FROM public.invoices WHERE order_id = p_order_id LIMIT 1;
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'Invoice already exists for this order: %', v_existing; END IF;

  v_inv_no := 'INV-' || to_char(now(),'YYYYMMDD') || '-' || substr(gen_random_uuid()::text,1,6);

  INSERT INTO public.invoices (tenant_id, invoice_number, order_id, customer_id, status, payment_status, subtotal, discount_amount, tax_amount, total_amount, due_date, notes, created_by)
  VALUES (v_tenant, v_inv_no, p_order_id, v_order.customer_id, 'pending', 'unpaid', v_order.subtotal, v_order.discount_amount, v_order.tax_amount, v_order.total_amount, CURRENT_DATE + INTERVAL '30 days', v_order.notes, auth.uid())
  RETURNING id INTO v_inv_id;

  INSERT INTO public.invoice_items (tenant_id, invoice_id, product_id, variant_id, quantity, unit_price, discount_percentage, total_price, notes)
  SELECT v_tenant, v_inv_id, product_id, variant_id, quantity, unit_price, discount_percentage, total_price, notes
  FROM public.sales_order_items WHERE order_id = p_order_id;

  UPDATE public.sales_orders SET status = 'invoiced' WHERE id = p_order_id;
  RETURN v_inv_id;
END $$;

-- CONVERT INVOICE → DELIVERY NOTE
CREATE OR REPLACE FUNCTION public.convert_invoice_to_delivery(p_invoice_id UUID, p_warehouse_id UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE v_tenant UUID; v_inv RECORD; v_dn_id UUID; v_existing UUID;
BEGIN
  v_tenant := public.get_current_tenant();
  SELECT * INTO v_inv FROM public.invoices WHERE id = p_invoice_id AND tenant_id = v_tenant FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Invoice not found'; END IF;

  SELECT id INTO v_existing FROM public.delivery_notes WHERE invoice_id = p_invoice_id LIMIT 1;
  IF v_existing IS NOT NULL THEN RAISE EXCEPTION 'Delivery already exists for this invoice: %', v_existing; END IF;

  INSERT INTO public.delivery_notes (tenant_id, sales_order_id, invoice_id, customer_id, warehouse_id, delivery_date, status, created_by)
  VALUES (v_tenant, v_inv.order_id, p_invoice_id, v_inv.customer_id, p_warehouse_id, CURRENT_DATE, 'draft', auth.uid())
  RETURNING id INTO v_dn_id;

  INSERT INTO public.delivery_note_items (tenant_id, delivery_id, product_id, variant_id, ordered_qty, delivered_qty)
  SELECT v_tenant, v_dn_id, product_id, variant_id, quantity, quantity
  FROM public.invoice_items WHERE invoice_id = p_invoice_id;

  RETURN v_dn_id;
END $$;

-- POSTING RULES
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='posting_rules') THEN
    INSERT INTO public.posting_rules (rule_code, document_type, description, is_active)
    VALUES
      ('SALES_INVOICE_POST', 'invoice', 'ترحيل فاتورة مبيعات: مدين العملاء / دائن إيرادات + ضريبة', true),
      ('DELIVERY_COGS_POST', 'delivery_note', 'ترحيل تكلفة البضاعة المباعة: مدين COGS / دائن المخزون', true)
    ON CONFLICT (rule_code) DO NOTHING;
  END IF;
END $$;