
-- ============================================================================
-- PHASE 2 / LAYER 1: Logistics & Three-Way Matching
-- ============================================================================

-- 1) ENUMs
DO $$ BEGIN
  CREATE TYPE public.goods_receipt_status AS ENUM ('draft','posted','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.delivery_note_status AS ENUM ('draft','in_transit','delivered','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.purchase_invoice_status AS ENUM ('draft','posted','paid','cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.purchase_invoice_payment_status AS ENUM ('pending','partial','paid');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.matching_status_enum AS ENUM ('matched','over_received','under_received','no_receipt','pending');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2) SEQUENCES
CREATE SEQUENCE IF NOT EXISTS public.goods_receipt_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.delivery_note_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.purchase_invoice_seq START 1;

-- ============================================================================
-- 3) GOODS RECEIPTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  receipt_number text NOT NULL,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE RESTRICT,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  received_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.goods_receipt_status NOT NULL DEFAULT 'draft',
  notes text,
  posted_at timestamptz,
  posted_by uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, receipt_number)
);

CREATE INDEX IF NOT EXISTS idx_gr_tenant_status ON public.goods_receipts(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_gr_po ON public.goods_receipts(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_gr_supplier_date ON public.goods_receipts(supplier_id, received_date DESC);

CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  receipt_id uuid NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ordered_qty numeric NOT NULL DEFAULT 0,
  received_qty numeric NOT NULL CHECK (received_qty >= 0),
  unit_cost numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gri_receipt ON public.goods_receipt_items(receipt_id);
CREATE INDEX IF NOT EXISTS idx_gri_product ON public.goods_receipt_items(product_id);

-- ============================================================================
-- 4) DELIVERY NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.delivery_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  delivery_number text NOT NULL,
  sales_order_id uuid REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE RESTRICT,
  warehouse_id uuid NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  delivery_date date NOT NULL DEFAULT CURRENT_DATE,
  status public.delivery_note_status NOT NULL DEFAULT 'draft',
  notes text,
  posted_at timestamptz,
  posted_by uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, delivery_number)
);

CREATE INDEX IF NOT EXISTS idx_dn_tenant_status ON public.delivery_notes(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_dn_so ON public.delivery_notes(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_dn_customer_date ON public.delivery_notes(customer_id, delivery_date DESC);

CREATE TABLE IF NOT EXISTS public.delivery_note_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  delivery_id uuid NOT NULL REFERENCES public.delivery_notes(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  ordered_qty numeric NOT NULL DEFAULT 0,
  delivered_qty numeric NOT NULL CHECK (delivered_qty >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dni_delivery ON public.delivery_note_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_dni_product ON public.delivery_note_items(product_id);

-- ============================================================================
-- 5) PURCHASE INVOICES
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.purchase_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_number text NOT NULL,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  purchase_order_id uuid REFERENCES public.purchase_orders(id) ON DELETE SET NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric NOT NULL DEFAULT 0,
  tax_amount numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total_amount numeric NOT NULL DEFAULT 0,
  paid_amount numeric NOT NULL DEFAULT 0,
  status public.purchase_invoice_status NOT NULL DEFAULT 'draft',
  payment_status public.purchase_invoice_payment_status NOT NULL DEFAULT 'pending',
  matching_status public.matching_status_enum NOT NULL DEFAULT 'pending',
  approval_required boolean NOT NULL DEFAULT false,
  notes text,
  posted_at timestamptz,
  posted_by uuid,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, invoice_number)
);

CREATE INDEX IF NOT EXISTS idx_pinv_tenant_status ON public.purchase_invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pinv_supplier_date ON public.purchase_invoices(supplier_id, invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_pinv_matching ON public.purchase_invoices(matching_status);
CREATE INDEX IF NOT EXISTS idx_pinv_po ON public.purchase_invoices(purchase_order_id);

CREATE TABLE IF NOT EXISTS public.purchase_invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  invoice_id uuid NOT NULL REFERENCES public.purchase_invoices(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  variant_id uuid REFERENCES public.product_variants(id) ON DELETE SET NULL,
  quantity numeric NOT NULL CHECK (quantity > 0),
  unit_price numeric NOT NULL DEFAULT 0,
  total_price numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pini_invoice ON public.purchase_invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_pini_product ON public.purchase_invoice_items(product_id);

-- ============================================================================
-- 6) NUMBERING TRIGGERS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.generate_goods_receipt_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := 'GR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('goods_receipt_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.generate_delivery_note_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.delivery_number IS NULL OR NEW.delivery_number = '' THEN
    NEW.delivery_number := 'DN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('delivery_note_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.generate_purchase_invoice_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := 'PINV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('purchase_invoice_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gr_number ON public.goods_receipts;
CREATE TRIGGER trg_gr_number BEFORE INSERT ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.generate_goods_receipt_number();

DROP TRIGGER IF EXISTS trg_dn_number ON public.delivery_notes;
CREATE TRIGGER trg_dn_number BEFORE INSERT ON public.delivery_notes
  FOR EACH ROW EXECUTE FUNCTION public.generate_delivery_note_number();

DROP TRIGGER IF EXISTS trg_pinv_number ON public.purchase_invoices;
CREATE TRIGGER trg_pinv_number BEFORE INSERT ON public.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION public.generate_purchase_invoice_number();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_gr_updated ON public.goods_receipts;
CREATE TRIGGER trg_gr_updated BEFORE UPDATE ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_dn_updated ON public.delivery_notes;
CREATE TRIGGER trg_dn_updated BEFORE UPDATE ON public.delivery_notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_pinv_updated ON public.purchase_invoices;
CREATE TRIGGER trg_pinv_updated BEFORE UPDATE ON public.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 7) AUTO-FILL tenant_id ON CHILD ITEMS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_gr_item_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.goods_receipts WHERE id = NEW.receipt_id;
  END IF;
  IF NEW.tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_id required for goods_receipt_items'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_dn_item_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.delivery_notes WHERE id = NEW.delivery_id;
  END IF;
  IF NEW.tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_id required for delivery_note_items'; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.set_pinv_item_tenant()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT tenant_id INTO NEW.tenant_id FROM public.purchase_invoices WHERE id = NEW.invoice_id;
  END IF;
  IF NEW.tenant_id IS NULL THEN RAISE EXCEPTION 'tenant_id required for purchase_invoice_items'; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_gri_tenant ON public.goods_receipt_items;
CREATE TRIGGER trg_gri_tenant BEFORE INSERT ON public.goods_receipt_items
  FOR EACH ROW EXECUTE FUNCTION public.set_gr_item_tenant();

DROP TRIGGER IF EXISTS trg_dni_tenant ON public.delivery_note_items;
CREATE TRIGGER trg_dni_tenant BEFORE INSERT ON public.delivery_note_items
  FOR EACH ROW EXECUTE FUNCTION public.set_dn_item_tenant();

DROP TRIGGER IF EXISTS trg_pini_tenant ON public.purchase_invoice_items;
CREATE TRIGGER trg_pini_tenant BEFORE INSERT ON public.purchase_invoice_items
  FOR EACH ROW EXECUTE FUNCTION public.set_pinv_item_tenant();

-- ============================================================================
-- 8) STOCK MOVEMENT ON GR POSTING
-- ============================================================================
CREATE OR REPLACE FUNCTION public.apply_gr_stock_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _it record;
BEGIN
  IF NOT (OLD.status = 'draft' AND NEW.status = 'posted') THEN
    RETURN NEW;
  END IF;

  FOR _it IN SELECT * FROM public.goods_receipt_items WHERE receipt_id = NEW.id LOOP
    -- Insert stock movement (in)
    INSERT INTO public.stock_movements
      (tenant_id, product_id, variant_id, to_warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
    VALUES
      (NEW.tenant_id, _it.product_id, _it.variant_id, NEW.warehouse_id, 'in', _it.received_qty,
       'goods_receipt', NEW.id,
       'GR ' || NEW.receipt_number, NEW.posted_by);

    -- Upsert product_stock
    INSERT INTO public.product_stock (tenant_id, product_id, variant_id, warehouse_id, quantity, updated_at)
    VALUES (NEW.tenant_id, _it.product_id, _it.variant_id, NEW.warehouse_id, _it.received_qty, now())
    ON CONFLICT (product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), warehouse_id)
    DO UPDATE SET quantity = public.product_stock.quantity + EXCLUDED.quantity, updated_at = now();
  END LOOP;

  RETURN NEW;
END $$;

-- product_stock needs a unique constraint for ON CONFLICT to work
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND indexname='ux_product_stock_pvw'
  ) THEN
    CREATE UNIQUE INDEX ux_product_stock_pvw ON public.product_stock
      (product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), warehouse_id);
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_gr_stock_post ON public.goods_receipts;
CREATE TRIGGER trg_gr_stock_post AFTER UPDATE OF status ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.apply_gr_stock_on_post();

-- ============================================================================
-- 9) STOCK MOVEMENT ON DN POSTING (allow negative + warn)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.apply_dn_stock_on_post()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _it record;
  _current numeric;
BEGIN
  IF NOT ((OLD.status IN ('draft','in_transit')) AND NEW.status = 'delivered') THEN
    RETURN NEW;
  END IF;

  FOR _it IN SELECT * FROM public.delivery_note_items WHERE delivery_id = NEW.id LOOP
    -- Check current stock
    SELECT COALESCE(quantity, 0) INTO _current
    FROM public.product_stock
    WHERE product_id = _it.product_id
      AND COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(_it.variant_id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND warehouse_id = NEW.warehouse_id;

    -- Warn if would go negative
    IF COALESCE(_current, 0) < _it.delivered_qty THEN
      INSERT INTO public.sync_logs (tenant_id, level, endpoint, message, metadata)
      VALUES (
        NEW.tenant_id, 'warning', 'delivery_note_post',
        'Stock would go negative for product ' || _it.product_id::text,
        jsonb_build_object(
          'delivery_id', NEW.id,
          'delivery_number', NEW.delivery_number,
          'product_id', _it.product_id,
          'warehouse_id', NEW.warehouse_id,
          'requested', _it.delivered_qty,
          'available', COALESCE(_current, 0),
          'deficit', _it.delivered_qty - COALESCE(_current, 0)
        )
      );
    END IF;

    -- Insert stock movement (out)
    INSERT INTO public.stock_movements
      (tenant_id, product_id, variant_id, from_warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
    VALUES
      (NEW.tenant_id, _it.product_id, _it.variant_id, NEW.warehouse_id, 'out', _it.delivered_qty,
       'delivery_note', NEW.id,
       'DN ' || NEW.delivery_number, NEW.posted_by);

    -- Decrement product_stock (allow negative)
    INSERT INTO public.product_stock (tenant_id, product_id, variant_id, warehouse_id, quantity, updated_at)
    VALUES (NEW.tenant_id, _it.product_id, _it.variant_id, NEW.warehouse_id, -_it.delivered_qty, now())
    ON CONFLICT (product_id, COALESCE(variant_id, '00000000-0000-0000-0000-000000000000'::uuid), warehouse_id)
    DO UPDATE SET quantity = public.product_stock.quantity - _it.delivered_qty, updated_at = now();
  END LOOP;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_dn_stock_post ON public.delivery_notes;
CREATE TRIGGER trg_dn_stock_post AFTER UPDATE OF status ON public.delivery_notes
  FOR EACH ROW EXECUTE FUNCTION public.apply_dn_stock_on_post();

-- ============================================================================
-- 10) THREE-WAY MATCHING ON PURCHASE INVOICE POST
-- ============================================================================
CREATE OR REPLACE FUNCTION public.compute_three_way_matching()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _has_gr boolean := false;
  _over boolean := false;
  _under boolean := false;
  _it record;
  _received numeric;
BEGIN
  IF NOT (OLD.status = 'draft' AND NEW.status = 'posted') THEN
    RETURN NEW;
  END IF;

  -- If no PO linked => cannot match
  IF NEW.purchase_order_id IS NULL THEN
    NEW.matching_status := 'no_receipt';
    NEW.approval_required := true;
    RETURN NEW;
  END IF;

  -- Check GR existence
  SELECT EXISTS (
    SELECT 1 FROM public.goods_receipts
    WHERE purchase_order_id = NEW.purchase_order_id
      AND status = 'posted'
      AND tenant_id = NEW.tenant_id
  ) INTO _has_gr;

  IF NOT _has_gr THEN
    NEW.matching_status := 'no_receipt';
    NEW.approval_required := true;

    INSERT INTO public.sync_logs (tenant_id, level, endpoint, message, metadata)
    VALUES (NEW.tenant_id, 'warning', 'three_way_matching',
            'Purchase invoice posted without any goods receipt',
            jsonb_build_object('invoice_id', NEW.id, 'invoice_number', NEW.invoice_number, 'po_id', NEW.purchase_order_id));
    RETURN NEW;
  END IF;

  -- Compare per item
  FOR _it IN SELECT product_id, COALESCE(variant_id,'00000000-0000-0000-0000-000000000000'::uuid) AS vk, SUM(quantity) AS qty
             FROM public.purchase_invoice_items
             WHERE invoice_id = NEW.id
             GROUP BY product_id, COALESCE(variant_id,'00000000-0000-0000-0000-000000000000'::uuid)
  LOOP
    SELECT COALESCE(SUM(received_qty), 0) INTO _received
    FROM public.goods_receipt_items gri
    JOIN public.goods_receipts gr ON gr.id = gri.receipt_id
    WHERE gr.purchase_order_id = NEW.purchase_order_id
      AND gr.status = 'posted'
      AND gri.product_id = _it.product_id
      AND COALESCE(gri.variant_id,'00000000-0000-0000-0000-000000000000'::uuid) = _it.vk;

    IF _it.qty > _received THEN _over := true; END IF;
    IF _it.qty < _received THEN _under := true; END IF;
  END LOOP;

  IF _over THEN
    NEW.matching_status := 'over_received';
    NEW.approval_required := true;
    INSERT INTO public.sync_logs (tenant_id, level, endpoint, message, metadata)
    VALUES (NEW.tenant_id, 'warning', 'three_way_matching',
            'Invoice quantity exceeds received quantity',
            jsonb_build_object('invoice_id', NEW.id, 'invoice_number', NEW.invoice_number));
  ELSIF _under THEN
    NEW.matching_status := 'under_received';
    NEW.approval_required := false;
  ELSE
    NEW.matching_status := 'matched';
    NEW.approval_required := false;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_pinv_matching ON public.purchase_invoices;
CREATE TRIGGER trg_pinv_matching BEFORE UPDATE OF status ON public.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION public.compute_three_way_matching();

-- ============================================================================
-- 11) PROTECT POSTED DOCUMENTS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.protect_posted_gr()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'posted' THEN
      RAISE EXCEPTION 'لا يمكن حذف إيصال استلام مرحّل. استخدم الإلغاء بدلاً من الحذف.' USING ERRCODE='check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status = 'posted' AND NEW.status = 'posted' THEN
    IF (NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id)
       OR (NEW.supplier_id IS DISTINCT FROM OLD.supplier_id)
       OR (NEW.purchase_order_id IS DISTINCT FROM OLD.purchase_order_id)
       OR (NEW.received_date IS DISTINCT FROM OLD.received_date) THEN
      RAISE EXCEPTION 'لا يمكن تعديل البيانات الجوهرية لإيصال استلام مرحّل.' USING ERRCODE='check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.protect_posted_dn()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status = 'delivered' THEN
      RAISE EXCEPTION 'لا يمكن حذف إذن تسليم مرحّل.' USING ERRCODE='check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status = 'delivered' AND NEW.status = 'delivered' THEN
    IF (NEW.warehouse_id IS DISTINCT FROM OLD.warehouse_id)
       OR (NEW.customer_id IS DISTINCT FROM OLD.customer_id)
       OR (NEW.delivery_date IS DISTINCT FROM OLD.delivery_date) THEN
      RAISE EXCEPTION 'لا يمكن تعديل البيانات الجوهرية لإذن تسليم مرحّل.' USING ERRCODE='check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.protect_posted_pinv()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('posted','paid') THEN
      RAISE EXCEPTION 'لا يمكن حذف فاتورة مشتريات مرحّلة.' USING ERRCODE='check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF OLD.status IN ('posted','paid') AND NEW.status IN ('posted','paid') THEN
    IF (NEW.total_amount IS DISTINCT FROM OLD.total_amount)
       OR (NEW.subtotal IS DISTINCT FROM OLD.subtotal)
       OR (NEW.supplier_id IS DISTINCT FROM OLD.supplier_id)
       OR (NEW.invoice_date IS DISTINCT FROM OLD.invoice_date) THEN
      RAISE EXCEPTION 'لا يمكن تعديل البيانات المالية لفاتورة مشتريات مرحّلة.' USING ERRCODE='check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_protect_gr ON public.goods_receipts;
CREATE TRIGGER trg_protect_gr BEFORE UPDATE OR DELETE ON public.goods_receipts
  FOR EACH ROW EXECUTE FUNCTION public.protect_posted_gr();

DROP TRIGGER IF EXISTS trg_protect_dn ON public.delivery_notes;
CREATE TRIGGER trg_protect_dn BEFORE UPDATE OR DELETE ON public.delivery_notes
  FOR EACH ROW EXECUTE FUNCTION public.protect_posted_dn();

DROP TRIGGER IF EXISTS trg_protect_pinv ON public.purchase_invoices;
CREATE TRIGGER trg_protect_pinv BEFORE UPDATE OR DELETE ON public.purchase_invoices
  FOR EACH ROW EXECUTE FUNCTION public.protect_posted_pinv();

-- ============================================================================
-- 12) ENABLE RLS + POLICIES
-- ============================================================================
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_note_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_invoice_items ENABLE ROW LEVEL SECURITY;

-- goods_receipts
CREATE POLICY gr_select ON public.goods_receipts FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());
CREATE POLICY gr_insert ON public.goods_receipts FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'inventory', 'create'));
CREATE POLICY gr_update ON public.goods_receipts FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'inventory', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant());
CREATE POLICY gr_delete ON public.goods_receipts FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'inventory', 'delete') AND status <> 'posted');

-- goods_receipt_items
CREATE POLICY gri_select ON public.goods_receipt_items FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());
CREATE POLICY gri_insert ON public.goods_receipt_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'inventory', 'create'));
CREATE POLICY gri_update ON public.goods_receipt_items FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'inventory', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant());
CREATE POLICY gri_delete ON public.goods_receipt_items FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'inventory', 'delete'));

-- delivery_notes
CREATE POLICY dn_select ON public.delivery_notes FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());
CREATE POLICY dn_insert ON public.delivery_notes FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'sales', 'create'));
CREATE POLICY dn_update ON public.delivery_notes FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'sales', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant());
CREATE POLICY dn_delete ON public.delivery_notes FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'sales', 'delete') AND status <> 'delivered');

-- delivery_note_items
CREATE POLICY dni_select ON public.delivery_note_items FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());
CREATE POLICY dni_insert ON public.delivery_note_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'sales', 'create'));
CREATE POLICY dni_update ON public.delivery_note_items FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'sales', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant());
CREATE POLICY dni_delete ON public.delivery_note_items FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'sales', 'delete'));

-- purchase_invoices
CREATE POLICY pinv_select ON public.purchase_invoices FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());
CREATE POLICY pinv_insert ON public.purchase_invoices FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'purchases', 'create'));
CREATE POLICY pinv_update ON public.purchase_invoices FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'purchases', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant());
CREATE POLICY pinv_delete ON public.purchase_invoices FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'purchases', 'delete') AND status NOT IN ('posted','paid'));

-- purchase_invoice_items
CREATE POLICY pini_select ON public.purchase_invoice_items FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());
CREATE POLICY pini_insert ON public.purchase_invoice_items FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'purchases', 'create'));
CREATE POLICY pini_update ON public.purchase_invoice_items FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'purchases', 'edit'))
  WITH CHECK (tenant_id = get_current_tenant());
CREATE POLICY pini_delete ON public.purchase_invoice_items FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(), 'purchases', 'delete'));

-- ============================================================================
-- 13) RPCs
-- ============================================================================
CREATE OR REPLACE FUNCTION public.post_goods_receipt(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid := get_current_tenant();
  _row record;
  _items_count int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT check_section_permission(auth.uid(), 'inventory', 'edit') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT * INTO _row FROM public.goods_receipts WHERE id = p_id AND tenant_id = _tenant FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF _row.status <> 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'current_status', _row.status);
  END IF;

  SELECT COUNT(*) INTO _items_count FROM public.goods_receipt_items WHERE receipt_id = p_id;
  IF _items_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_items');
  END IF;

  UPDATE public.goods_receipts
  SET status = 'posted', posted_at = now(), posted_by = auth.uid(), updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true, 'receipt_id', p_id, 'items_processed', _items_count);
END $$;

CREATE OR REPLACE FUNCTION public.post_delivery_note(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid := get_current_tenant();
  _row record;
  _items_count int;
  _warnings int;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT check_section_permission(auth.uid(), 'sales', 'edit') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT * INTO _row FROM public.delivery_notes WHERE id = p_id AND tenant_id = _tenant FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF _row.status NOT IN ('draft','in_transit') THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'current_status', _row.status);
  END IF;

  SELECT COUNT(*) INTO _items_count FROM public.delivery_note_items WHERE delivery_id = p_id;
  IF _items_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_items');
  END IF;

  UPDATE public.delivery_notes
  SET status = 'delivered', posted_at = now(), posted_by = auth.uid(), updated_at = now()
  WHERE id = p_id;

  -- Count warnings just produced
  SELECT COUNT(*) INTO _warnings FROM public.sync_logs
  WHERE endpoint = 'delivery_note_post'
    AND tenant_id = _tenant
    AND created_at > now() - interval '5 seconds'
    AND metadata->>'delivery_id' = p_id::text;

  RETURN jsonb_build_object('success', true, 'delivery_id', p_id, 'items_processed', _items_count, 'stock_warnings', _warnings);
END $$;

CREATE OR REPLACE FUNCTION public.post_purchase_invoice(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid := get_current_tenant();
  _row record;
  _items_count int;
  _is_admin boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT check_section_permission(auth.uid(), 'purchases', 'edit') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT * INTO _row FROM public.purchase_invoices WHERE id = p_id AND tenant_id = _tenant FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF _row.status <> 'draft' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_status', 'current_status', _row.status);
  END IF;

  SELECT COUNT(*) INTO _items_count FROM public.purchase_invoice_items WHERE invoice_id = p_id;
  IF _items_count = 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'no_items');
  END IF;

  -- Trigger compute_three_way_matching will set matching_status & approval_required
  UPDATE public.purchase_invoices
  SET status = 'posted', posted_at = now(), posted_by = auth.uid(), updated_at = now()
  WHERE id = p_id;

  -- Re-read to get matching results
  SELECT * INTO _row FROM public.purchase_invoices WHERE id = p_id;

  _is_admin := has_role(auth.uid(), 'admin'::app_role);

  RETURN jsonb_build_object(
    'success', true,
    'invoice_id', p_id,
    'matching_status', _row.matching_status,
    'approval_required', _row.approval_required,
    'auto_approved', NOT _row.approval_required OR _is_admin
  );
END $$;

CREATE OR REPLACE FUNCTION public.cancel_goods_receipt(p_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid := get_current_tenant();
  _row record;
  _it record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT check_section_permission(auth.uid(), 'inventory', 'delete') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT * INTO _row FROM public.goods_receipts WHERE id = p_id AND tenant_id = _tenant FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF _row.status = 'cancelled' THEN RETURN jsonb_build_object('success', false, 'error', 'already_cancelled'); END IF;

  -- If was posted: reverse stock movements
  IF _row.status = 'posted' THEN
    FOR _it IN SELECT * FROM public.goods_receipt_items WHERE receipt_id = p_id LOOP
      INSERT INTO public.stock_movements
        (tenant_id, product_id, variant_id, from_warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
      VALUES
        (_tenant, _it.product_id, _it.variant_id, _row.warehouse_id, 'out', _it.received_qty,
         'goods_receipt_cancel', p_id,
         'إلغاء GR ' || _row.receipt_number || COALESCE(' — ' || _reason, ''), auth.uid());

      UPDATE public.product_stock
      SET quantity = quantity - _it.received_qty, updated_at = now()
      WHERE product_id = _it.product_id
        AND COALESCE(variant_id,'00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(_it.variant_id,'00000000-0000-0000-0000-000000000000'::uuid)
        AND warehouse_id = _row.warehouse_id;
    END LOOP;
  END IF;

  -- Bypass protect trigger: status going posted->cancelled is allowed because it's not posted->posted
  UPDATE public.goods_receipts
  SET status = 'cancelled',
      notes = COALESCE(notes,'') || E'\n[إلغاء] ' || COALESCE(_reason,''),
      updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true, 'receipt_id', p_id);
END $$;

CREATE OR REPLACE FUNCTION public.cancel_delivery_note(p_id uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid := get_current_tenant();
  _row record;
  _it record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT check_section_permission(auth.uid(), 'sales', 'delete') THEN
    RAISE EXCEPTION 'Insufficient permission';
  END IF;

  SELECT * INTO _row FROM public.delivery_notes WHERE id = p_id AND tenant_id = _tenant FOR UPDATE;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'not_found'); END IF;
  IF _row.status = 'cancelled' THEN RETURN jsonb_build_object('success', false, 'error', 'already_cancelled'); END IF;

  IF _row.status = 'delivered' THEN
    FOR _it IN SELECT * FROM public.delivery_note_items WHERE delivery_id = p_id LOOP
      INSERT INTO public.stock_movements
        (tenant_id, product_id, variant_id, to_warehouse_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
      VALUES
        (_tenant, _it.product_id, _it.variant_id, _row.warehouse_id, 'in', _it.delivered_qty,
         'delivery_note_cancel', p_id,
         'إلغاء DN ' || _row.delivery_number || COALESCE(' — ' || _reason, ''), auth.uid());

      UPDATE public.product_stock
      SET quantity = quantity + _it.delivered_qty, updated_at = now()
      WHERE product_id = _it.product_id
        AND COALESCE(variant_id,'00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(_it.variant_id,'00000000-0000-0000-0000-000000000000'::uuid)
        AND warehouse_id = _row.warehouse_id;
    END LOOP;
  END IF;

  UPDATE public.delivery_notes
  SET status = 'cancelled',
      notes = COALESCE(notes,'') || E'\n[إلغاء] ' || COALESCE(_reason,''),
      updated_at = now()
  WHERE id = p_id;

  RETURN jsonb_build_object('success', true, 'delivery_id', p_id);
END $$;

-- ============================================================================
-- 14) GRANTS — restrict definer functions
-- ============================================================================
REVOKE EXECUTE ON FUNCTION public.post_goods_receipt(uuid)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.post_delivery_note(uuid)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.post_purchase_invoice(uuid)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_goods_receipt(uuid,text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_delivery_note(uuid,text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.post_goods_receipt(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_delivery_note(uuid)        TO authenticated;
GRANT EXECUTE ON FUNCTION public.post_purchase_invoice(uuid)     TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_goods_receipt(uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_delivery_note(uuid,text) TO authenticated;

-- internal trigger funcs: lock down
REVOKE EXECUTE ON FUNCTION public.apply_gr_stock_on_post()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_dn_stock_on_post()     FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.compute_three_way_matching() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_gr_item_tenant()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_dn_item_tenant()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_pinv_item_tenant()       FROM PUBLIC, anon, authenticated;
