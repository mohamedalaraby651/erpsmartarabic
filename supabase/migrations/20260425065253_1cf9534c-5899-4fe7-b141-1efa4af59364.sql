-- ========================================
-- PHASE 0: CRITICAL SECURITY FIXES
-- ========================================

-- ===== A. Cross-tenant role-only policies =====
DROP POLICY IF EXISTS "chart_of_accounts_manage" ON public.chart_of_accounts;
DROP POLICY IF EXISTS "chart_of_accounts_select" ON public.chart_of_accounts;

DROP POLICY IF EXISTS "journals_select" ON public.journals;
DROP POLICY IF EXISTS "journals_insert" ON public.journals;
DROP POLICY IF EXISTS "journals_update" ON public.journals;
DROP POLICY IF EXISTS "journals_delete" ON public.journals;

DROP POLICY IF EXISTS "journal_entries_select" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_insert" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_update" ON public.journal_entries;
DROP POLICY IF EXISTS "journal_entries_delete" ON public.journal_entries;

DROP POLICY IF EXISTS "bank_accounts_manage_policy" ON public.bank_accounts;
DROP POLICY IF EXISTS "bank_accounts_select_policy" ON public.bank_accounts;

DROP POLICY IF EXISTS "cash_registers_manage_policy" ON public.cash_registers;
DROP POLICY IF EXISTS "cash_registers_select_policy" ON public.cash_registers;

DROP POLICY IF EXISTS "expense_categories_manage_policy" ON public.expense_categories;
DROP POLICY IF EXISTS "Tenant members view expense categories" ON public.expense_categories;

DROP POLICY IF EXISTS "Admin or accountant can manage supplier payments" ON public.supplier_payments;
DROP POLICY IF EXISTS "Admin or warehouse can manage warehouses" ON public.warehouses;

DROP POLICY IF EXISTS "fiscal_periods_manage" ON public.fiscal_periods;
DROP POLICY IF EXISTS "fiscal_periods_select" ON public.fiscal_periods;

DROP POLICY IF EXISTS "product_categories_manage_policy" ON public.product_categories;
DROP POLICY IF EXISTS "Admin or warehouse can manage variants" ON public.product_variants;
DROP POLICY IF EXISTS "Admin or warehouse can manage purchase order items" ON public.purchase_order_items;

-- ===== B. Expenses lax policies =====
DROP POLICY IF EXISTS "expenses_insert_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_select_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_update_policy" ON public.expenses;
DROP POLICY IF EXISTS "expenses_delete_policy" ON public.expenses;

-- ===== C. supplier_notes tenant_id =====
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='supplier_notes' AND column_name='tenant_id'
  ) THEN
    ALTER TABLE public.supplier_notes ADD COLUMN tenant_id UUID;
    UPDATE public.supplier_notes sn SET tenant_id = s.tenant_id
      FROM public.suppliers s WHERE sn.supplier_id = s.id;
    DELETE FROM public.supplier_notes WHERE tenant_id IS NULL;
    ALTER TABLE public.supplier_notes 
      ALTER COLUMN tenant_id SET NOT NULL,
      ALTER COLUMN tenant_id SET DEFAULT public.get_current_tenant();
    CREATE INDEX IF NOT EXISTS idx_supplier_notes_tenant ON public.supplier_notes(tenant_id);
  END IF;
END $$;

DROP POLICY IF EXISTS "supplier_notes_select_policy" ON public.supplier_notes;
DROP POLICY IF EXISTS "supplier_notes_insert_policy" ON public.supplier_notes;
DROP POLICY IF EXISTS "supplier_notes_delete_policy" ON public.supplier_notes;
DROP POLICY IF EXISTS "supplier_notes_update_policy" ON public.supplier_notes;

ALTER TABLE public.supplier_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant users can view supplier notes"
ON public.supplier_notes FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());

CREATE POLICY "Tenant users can create supplier notes"
ON public.supplier_notes FOR INSERT TO authenticated
WITH CHECK (tenant_id = public.get_current_tenant());

CREATE POLICY "Tenant users can update supplier notes"
ON public.supplier_notes FOR UPDATE TO authenticated
USING (tenant_id = public.get_current_tenant())
WITH CHECK (tenant_id = public.get_current_tenant());

CREATE POLICY "Tenant users can delete supplier notes"
ON public.supplier_notes FOR DELETE TO authenticated
USING (tenant_id = public.get_current_tenant());

-- ===== D. Harden check_financial_limit (keep signature, replace body) =====
CREATE OR REPLACE FUNCTION public.check_financial_limit(
  _user_id uuid,
  _limit_type text,
  _value numeric
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _tenant UUID;
  _custom_role_id UUID;
  _max_value DECIMAL;
BEGIN
  IF public.has_role(_user_id, 'admin') THEN
    RETURN true;
  END IF;

  _tenant := public.get_current_tenant();
  IF _tenant IS NULL THEN
    RETURN false;
  END IF;

  SELECT custom_role_id INTO _custom_role_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND (tenant_id = _tenant OR tenant_id IS NULL)
  ORDER BY (tenant_id = _tenant) DESC NULLS LAST
  LIMIT 1;

  IF _custom_role_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT
    CASE _limit_type
      WHEN 'discount' THEN max_discount_percentage
      WHEN 'credit'   THEN max_credit_limit
      WHEN 'invoice'  THEN max_invoice_amount
      ELSE 999999999
    END
  INTO _max_value
  FROM public.role_limits
  WHERE role_id = _custom_role_id
    AND (tenant_id = _tenant OR tenant_id IS NULL)
  ORDER BY (tenant_id = _tenant) DESC NULLS LAST
  LIMIT 1;

  RETURN _value <= COALESCE(_max_value, 999999999);
END;
$$;