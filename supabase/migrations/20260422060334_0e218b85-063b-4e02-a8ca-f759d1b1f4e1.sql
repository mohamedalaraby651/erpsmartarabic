-- =====================================================================
-- PHASE 1: PERFORMANCE — Composite Indexes
-- =====================================================================

-- Invoices: most filtered by tenant + status + date
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status_date 
  ON public.invoices(tenant_id, payment_status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_customer_date 
  ON public.invoices(tenant_id, customer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_due_date 
  ON public.invoices(tenant_id, due_date) WHERE payment_status IN ('pending', 'partial');

-- Payments
CREATE INDEX IF NOT EXISTS idx_payments_tenant_date 
  ON public.payments(tenant_id, payment_date DESC);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_customer 
  ON public.payments(tenant_id, customer_id, payment_date DESC);

-- Journal entries
CREATE INDEX IF NOT EXISTS idx_journal_entries_tenant_journal 
  ON public.journal_entries(tenant_id, journal_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_account 
  ON public.journal_entries(account_id, journal_id);

-- Customers / Suppliers
CREATE INDEX IF NOT EXISTS idx_customers_tenant_active_balance 
  ON public.customers(tenant_id, is_active, current_balance) WHERE current_balance > 0;
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant_active 
  ON public.suppliers(tenant_id, is_active);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date_status 
  ON public.expenses(tenant_id, expense_date DESC, status);

-- Activity logs (already heavy — partial index)
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant_user_date 
  ON public.activity_logs(tenant_id, user_id, created_at DESC);

-- Notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread 
  ON public.notifications(user_id, is_read, created_at DESC) WHERE is_read = false;

-- =====================================================================
-- PHASE 1: SLOW QUERY MONITOR
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.slow_queries_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  endpoint TEXT NOT NULL,
  query_name TEXT,
  duration_ms NUMERIC NOT NULL,
  threshold_ms NUMERIC DEFAULT 1000,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_slow_queries_tenant_date 
  ON public.slow_queries_log(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_slow_queries_endpoint 
  ON public.slow_queries_log(endpoint, duration_ms DESC);

ALTER TABLE public.slow_queries_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view slow queries" 
  ON public.slow_queries_log FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert slow queries" 
  ON public.slow_queries_log FOR INSERT 
  WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.log_slow_query(
  _endpoint TEXT,
  _duration_ms NUMERIC,
  _query_name TEXT DEFAULT NULL,
  _metadata JSONB DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF _duration_ms < 500 THEN RETURN; END IF;
  INSERT INTO slow_queries_log (tenant_id, user_id, endpoint, query_name, duration_ms, metadata)
  VALUES (get_current_tenant(), auth.uid(), _endpoint, _query_name, _duration_ms, _metadata);
END;
$$;

-- =====================================================================
-- PHASE 3: UNIFIED AUDIT TRAIL
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.audit_trail (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id UUID,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  before_value JSONB,
  after_value JSONB,
  changed_fields TEXT[],
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_trail_tenant_table_date 
  ON public.audit_trail(tenant_id, table_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_record 
  ON public.audit_trail(table_name, record_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_trail_user_date 
  ON public.audit_trail(user_id, created_at DESC);

ALTER TABLE public.audit_trail ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit trail" 
  ON public.audit_trail FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') AND tenant_id = public.get_current_tenant());

CREATE POLICY "System can insert audit trail" 
  ON public.audit_trail FOR INSERT 
  WITH CHECK (true);

-- Generic trigger function
CREATE OR REPLACE FUNCTION public.track_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _before JSONB;
  _after JSONB;
  _changed TEXT[] := '{}';
  _record_id UUID;
  _tenant UUID;
  _key TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    _before := to_jsonb(OLD);
    _after := NULL;
    _record_id := (OLD.id);
    _tenant := COALESCE((to_jsonb(OLD)->>'tenant_id')::uuid, get_current_tenant());
  ELSIF TG_OP = 'INSERT' THEN
    _before := NULL;
    _after := to_jsonb(NEW);
    _record_id := (NEW.id);
    _tenant := COALESCE((to_jsonb(NEW)->>'tenant_id')::uuid, get_current_tenant());
  ELSE
    _before := to_jsonb(OLD);
    _after := to_jsonb(NEW);
    _record_id := (NEW.id);
    _tenant := COALESCE((to_jsonb(NEW)->>'tenant_id')::uuid, get_current_tenant());
    -- Compute changed fields
    FOR _key IN SELECT jsonb_object_keys(_after) LOOP
      IF (_before->_key) IS DISTINCT FROM (_after->_key) THEN
        _changed := array_append(_changed, _key);
      END IF;
    END LOOP;
    -- Skip if only updated_at changed
    IF array_length(_changed, 1) = 1 AND _changed[1] = 'updated_at' THEN
      RETURN COALESCE(NEW, OLD);
    END IF;
  END IF;

  INSERT INTO audit_trail (
    tenant_id, user_id, table_name, record_id, operation,
    before_value, after_value, changed_fields
  ) VALUES (
    _tenant, auth.uid(), TG_TABLE_NAME, _record_id, TG_OP,
    _before, _after, _changed
  );

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Apply trigger to 14 critical financial tables
DO $$
DECLARE
  _tbl TEXT;
  _tables TEXT[] := ARRAY[
    'invoices', 'payments', 'credit_notes', 'journals', 'journal_entries',
    'expenses', 'supplier_payments', 'purchase_orders', 'customers', 'suppliers',
    'employees', 'custom_roles', 'role_section_permissions', 'role_limits'
  ];
BEGIN
  FOREACH _tbl IN ARRAY _tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_track_changes ON public.%I', _tbl);
    EXECUTE format('CREATE TRIGGER audit_track_changes AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.track_changes()', _tbl);
  END LOOP;
END $$;

-- =====================================================================
-- PHASE 2: DOMAIN EVENTS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.domain_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  aggregate_type TEXT,
  aggregate_id UUID,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'processed', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  emitted_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_domain_events_status_created 
  ON public.domain_events(status, created_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_domain_events_tenant_type_date 
  ON public.domain_events(tenant_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_domain_events_aggregate 
  ON public.domain_events(aggregate_type, aggregate_id);

ALTER TABLE public.domain_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view domain events" 
  ON public.domain_events FOR SELECT 
  USING (public.has_role(auth.uid(), 'admin') AND tenant_id = public.get_current_tenant());

CREATE POLICY "System can insert events" 
  ON public.domain_events FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "System can update events" 
  ON public.domain_events FOR UPDATE 
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.emit_event(
  _event_type TEXT,
  _aggregate_type TEXT,
  _aggregate_id UUID,
  _payload JSONB DEFAULT '{}'::jsonb
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _event_id UUID;
BEGIN
  INSERT INTO domain_events (tenant_id, event_type, aggregate_type, aggregate_id, payload, emitted_by)
  VALUES (get_current_tenant(), _event_type, _aggregate_type, _aggregate_id, _payload, auth.uid())
  RETURNING id INTO _event_id;
  RETURN _event_id;
END;
$$;

-- Trigger: invoice.approved
CREATE OR REPLACE FUNCTION public.emit_invoice_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.approval_status IS DISTINCT FROM NEW.approval_status 
     AND NEW.approval_status = 'approved' THEN
    PERFORM emit_event(
      'invoice.approved', 'invoice', NEW.id,
      jsonb_build_object('invoice_number', NEW.invoice_number, 'customer_id', NEW.customer_id, 'total_amount', NEW.total_amount)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_emit_invoice_approved ON public.invoices;
CREATE TRIGGER trg_emit_invoice_approved AFTER UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.emit_invoice_approved();

-- Trigger: payment.received
CREATE OR REPLACE FUNCTION public.emit_payment_received()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM emit_event(
    'payment.received', 'payment', NEW.id,
    jsonb_build_object('payment_number', NEW.payment_number, 'customer_id', NEW.customer_id, 'amount', NEW.amount, 'invoice_id', NEW.invoice_id)
  );
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_emit_payment_received ON public.payments;
CREATE TRIGGER trg_emit_payment_received AFTER INSERT ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.emit_payment_received();

-- Trigger: expense.approved
CREATE OR REPLACE FUNCTION public.emit_expense_approved()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'approved' THEN
    PERFORM emit_event(
      'expense.approved', 'expense', NEW.id,
      jsonb_build_object('expense_number', NEW.expense_number, 'amount', NEW.amount, 'category_id', NEW.category_id)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_emit_expense_approved ON public.expenses;
CREATE TRIGGER trg_emit_expense_approved AFTER UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.emit_expense_approved();

-- Trigger: customer.credit_exceeded
CREATE OR REPLACE FUNCTION public.emit_customer_credit_exceeded()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.credit_limit IS NOT NULL AND NEW.credit_limit > 0 
     AND NEW.current_balance > NEW.credit_limit
     AND (OLD.current_balance IS NULL OR OLD.current_balance <= NEW.credit_limit) THEN
    PERFORM emit_event(
      'customer.credit_exceeded', 'customer', NEW.id,
      jsonb_build_object('customer_name', NEW.name, 'credit_limit', NEW.credit_limit, 'current_balance', NEW.current_balance)
    );
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_emit_customer_credit_exceeded ON public.customers;
CREATE TRIGGER trg_emit_customer_credit_exceeded AFTER UPDATE ON public.customers
  FOR EACH ROW EXECUTE FUNCTION public.emit_customer_credit_exceeded();

-- Trigger: stock.depleted (on product_stock if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_stock') THEN
    EXECUTE $TRG$
      CREATE OR REPLACE FUNCTION public.emit_stock_depleted()
      RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $f$
      DECLARE _min_stock numeric; _product_name text;
      BEGIN
        SELECT min_stock, name INTO _min_stock, _product_name FROM products WHERE id = NEW.product_id;
        IF _min_stock IS NOT NULL AND NEW.quantity < _min_stock 
           AND (OLD.quantity IS NULL OR OLD.quantity >= _min_stock) THEN
          PERFORM emit_event(
            'stock.depleted', 'product', NEW.product_id,
            jsonb_build_object('product_name', _product_name, 'current_quantity', NEW.quantity, 'min_stock', _min_stock)
          );
        END IF;
        RETURN NEW;
      END;
      $f$;
    $TRG$;
    EXECUTE 'DROP TRIGGER IF EXISTS trg_emit_stock_depleted ON public.product_stock';
    EXECUTE 'CREATE TRIGGER trg_emit_stock_depleted AFTER UPDATE ON public.product_stock FOR EACH ROW EXECUTE FUNCTION public.emit_stock_depleted()';
  END IF;
END $$;

-- =====================================================================
-- PHASE 5: PERMISSION MATRIX CACHE
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.permission_matrix_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  matrix JSONB NOT NULL DEFAULT '{}'::jsonb,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 hour'),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_perm_cache_user 
  ON public.permission_matrix_cache(user_id, tenant_id);

ALTER TABLE public.permission_matrix_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own permission cache" 
  ON public.permission_matrix_cache FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "System manages permission cache" 
  ON public.permission_matrix_cache FOR ALL 
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.compute_permission_matrix(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_admin BOOLEAN;
  _custom_role_id UUID;
  _matrix JSONB := '{}'::jsonb;
BEGIN
  _is_admin := has_role(_user_id, 'admin');
  IF _is_admin THEN
    RETURN jsonb_build_object('is_admin', true, 'sections', '*'::jsonb);
  END IF;

  SELECT custom_role_id INTO _custom_role_id FROM user_roles WHERE user_id = _user_id LIMIT 1;
  IF _custom_role_id IS NULL THEN
    RETURN jsonb_build_object('is_admin', false, 'sections', '{}'::jsonb);
  END IF;

  SELECT jsonb_object_agg(
    section,
    jsonb_build_object(
      'view', can_view, 'create', can_create, 'edit', can_edit, 'delete', can_delete
    )
  ) INTO _matrix
  FROM role_section_permissions WHERE role_id = _custom_role_id;

  RETURN jsonb_build_object('is_admin', false, 'role_id', _custom_role_id, 'sections', COALESCE(_matrix, '{}'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_permission_matrix(_user_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _cached JSONB;
  _tenant UUID;
BEGIN
  _tenant := get_current_tenant();
  
  SELECT matrix INTO _cached
  FROM permission_matrix_cache
  WHERE user_id = _user_id AND tenant_id = _tenant AND expires_at > now()
  LIMIT 1;
  
  IF _cached IS NOT NULL THEN RETURN _cached; END IF;
  
  _cached := compute_permission_matrix(_user_id);
  
  INSERT INTO permission_matrix_cache (user_id, tenant_id, matrix, computed_at, expires_at)
  VALUES (_user_id, _tenant, _cached, now(), now() + interval '1 hour')
  ON CONFLICT (user_id, tenant_id) DO UPDATE
  SET matrix = EXCLUDED.matrix, computed_at = EXCLUDED.computed_at, expires_at = EXCLUDED.expires_at;
  
  RETURN _cached;
END;
$$;

-- Auto-invalidate cache on role changes
CREATE OR REPLACE FUNCTION public.invalidate_permission_cache()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_TABLE_NAME = 'user_roles' THEN
    DELETE FROM permission_matrix_cache WHERE user_id = COALESCE(NEW.user_id, OLD.user_id);
  ELSE
    -- For role_section_permissions / role_limits, invalidate all users with that custom role
    DELETE FROM permission_matrix_cache 
    WHERE user_id IN (
      SELECT user_id FROM user_roles WHERE custom_role_id = COALESCE(NEW.role_id, OLD.role_id)
    );
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_invalidate_perm_cache_user_roles ON public.user_roles;
CREATE TRIGGER trg_invalidate_perm_cache_user_roles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_roles
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_permission_cache();

DROP TRIGGER IF EXISTS trg_invalidate_perm_cache_section ON public.role_section_permissions;
CREATE TRIGGER trg_invalidate_perm_cache_section
  AFTER INSERT OR UPDATE OR DELETE ON public.role_section_permissions
  FOR EACH ROW EXECUTE FUNCTION public.invalidate_permission_cache();

-- =====================================================================
-- PHASE 5: MATERIALIZED VIEWS for heavy reports
-- =====================================================================

-- Sales summary by tenant + month
DROP MATERIALIZED VIEW IF EXISTS extensions.mv_sales_summary CASCADE;
CREATE MATERIALIZED VIEW extensions.mv_sales_summary AS
SELECT
  i.tenant_id,
  DATE_TRUNC('month', i.created_at) AS month,
  COUNT(*) AS invoice_count,
  SUM(i.total_amount) AS total_sales,
  SUM(COALESCE(i.paid_amount, 0)) AS total_paid,
  SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS total_outstanding,
  COUNT(DISTINCT i.customer_id) AS unique_customers
FROM public.invoices i
WHERE i.tenant_id IS NOT NULL
GROUP BY i.tenant_id, DATE_TRUNC('month', i.created_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_sales_summary 
  ON extensions.mv_sales_summary(tenant_id, month);

-- AR Aging summary
DROP MATERIALIZED VIEW IF EXISTS extensions.mv_ar_aging CASCADE;
CREATE MATERIALIZED VIEW extensions.mv_ar_aging AS
SELECT
  i.tenant_id,
  i.customer_id,
  c.name AS customer_name,
  SUM(CASE WHEN EXTRACT(DAY FROM (now() - COALESCE(i.due_date::timestamp, i.created_at::timestamp))) <= 30 
    THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS bucket_0_30,
  SUM(CASE WHEN EXTRACT(DAY FROM (now() - COALESCE(i.due_date::timestamp, i.created_at::timestamp))) BETWEEN 31 AND 60 
    THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS bucket_31_60,
  SUM(CASE WHEN EXTRACT(DAY FROM (now() - COALESCE(i.due_date::timestamp, i.created_at::timestamp))) BETWEEN 61 AND 90 
    THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS bucket_61_90,
  SUM(CASE WHEN EXTRACT(DAY FROM (now() - COALESCE(i.due_date::timestamp, i.created_at::timestamp))) > 90 
    THEN i.total_amount - COALESCE(i.paid_amount, 0) ELSE 0 END) AS bucket_90_plus,
  SUM(i.total_amount - COALESCE(i.paid_amount, 0)) AS total_outstanding
FROM public.invoices i
JOIN public.customers c ON c.id = i.customer_id
WHERE i.payment_status IN ('pending', 'partial')
  AND i.tenant_id IS NOT NULL
GROUP BY i.tenant_id, i.customer_id, c.name;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_ar_aging 
  ON extensions.mv_ar_aging(tenant_id, customer_id);

-- Inventory valuation
DROP MATERIALIZED VIEW IF EXISTS extensions.mv_inventory_valuation CASCADE;
CREATE MATERIALIZED VIEW extensions.mv_inventory_valuation AS
SELECT
  p.tenant_id,
  p.id AS product_id,
  p.name AS product_name,
  p.sku,
  COALESCE(SUM(ps.quantity), 0) AS total_quantity,
  p.cost_price,
  COALESCE(SUM(ps.quantity), 0) * COALESCE(p.cost_price, 0) AS valuation
FROM public.products p
LEFT JOIN public.product_stock ps ON ps.product_id = p.id
WHERE p.tenant_id IS NOT NULL
GROUP BY p.tenant_id, p.id, p.name, p.sku, p.cost_price;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_inventory_valuation 
  ON extensions.mv_inventory_valuation(tenant_id, product_id);

-- Refresh function
CREATE OR REPLACE FUNCTION public.refresh_enterprise_mvs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY extensions.mv_sales_summary;
  REFRESH MATERIALIZED VIEW CONCURRENTLY extensions.mv_ar_aging;
  REFRESH MATERIALIZED VIEW CONCURRENTLY extensions.mv_inventory_valuation;
END;
$$;

-- Read access RPCs
CREATE OR REPLACE FUNCTION public.get_sales_summary_mv()
RETURNS SETOF extensions.mv_sales_summary
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT * FROM extensions.mv_sales_summary WHERE tenant_id = get_current_tenant() ORDER BY month DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_ar_aging_mv()
RETURNS SETOF extensions.mv_ar_aging
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT * FROM extensions.mv_ar_aging WHERE tenant_id = get_current_tenant() ORDER BY total_outstanding DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_inventory_valuation_mv()
RETURNS SETOF extensions.mv_inventory_valuation
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  SELECT * FROM extensions.mv_inventory_valuation WHERE tenant_id = get_current_tenant() ORDER BY valuation DESC;
$$;