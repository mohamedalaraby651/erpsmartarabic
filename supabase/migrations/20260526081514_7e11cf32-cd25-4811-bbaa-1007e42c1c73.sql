
-- ============================================================
-- المرحلة 1: تحصين أمان منظومة المحاسبة (Security Hardening)
-- ============================================================

-- 1) إعادة كتابة سياسات INSERT بإضافة WITH CHECK مع check_section_permission
DROP POLICY IF EXISTS "Tenant users can create accounts" ON public.chart_of_accounts;
CREATE POLICY "Tenant users can create accounts"
ON public.chart_of_accounts
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_current_tenant()
  AND check_section_permission(auth.uid(), 'accounting', 'create')
);

DROP POLICY IF EXISTS "Tenant users can create journals" ON public.journals;
CREATE POLICY "Tenant users can create journals"
ON public.journals
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_current_tenant()
  AND check_section_permission(auth.uid(), 'accounting', 'create')
);

DROP POLICY IF EXISTS "Tenant users can create journal entries" ON public.journal_entries;
CREATE POLICY "Tenant users can create journal entries"
ON public.journal_entries
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_current_tenant()
  AND check_section_permission(auth.uid(), 'accounting', 'create')
);

DROP POLICY IF EXISTS "Tenant users can create fiscal periods" ON public.fiscal_periods;
CREATE POLICY "Tenant users can create fiscal periods"
ON public.fiscal_periods
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = get_current_tenant()
  AND check_section_permission(auth.uid(), 'accounting', 'create')
);

-- 2) تقييد INSERT على document_posting_log: لا يُسمح إلا للـ service_role أو SECURITY DEFINER RPCs
DROP POLICY IF EXISTS "dpl_system_insert" ON public.document_posting_log;
CREATE POLICY "dpl_service_role_insert_only"
ON public.document_posting_log
FOR INSERT
TO service_role
WITH CHECK (true);

-- منع المستخدمين العاديين من الكتابة المباشرة
REVOKE INSERT, UPDATE, DELETE ON public.document_posting_log FROM authenticated, anon;

-- 3) Trigger جديد: منع الترحيل/الإدخال في فترة مالية مغلقة أو خارج النطاق
CREATE OR REPLACE FUNCTION public.enforce_fiscal_period_open()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _period RECORD;
BEGIN
  IF NEW.fiscal_period_id IS NULL THEN
    RAISE EXCEPTION 'الفترة المالية مطلوبة لإنشاء قيد محاسبي.'
      USING ERRCODE = 'check_violation';
  END IF;

  SELECT start_date, end_date, is_closed
    INTO _period
    FROM public.fiscal_periods
   WHERE id = NEW.fiscal_period_id
     AND tenant_id = NEW.tenant_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'الفترة المالية غير موجودة أو لا تخص هذا الـ tenant.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF _period.is_closed THEN
    RAISE EXCEPTION 'لا يمكن إنشاء أو تعديل قيد في فترة مالية مقفلة.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.journal_date < _period.start_date OR NEW.journal_date > _period.end_date THEN
    RAISE EXCEPTION 'تاريخ القيد (%) خارج نطاق الفترة المالية المختارة (%—%).',
      NEW.journal_date, _period.start_date, _period.end_date
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_fiscal_period_open ON public.journals;
CREATE TRIGGER trg_enforce_fiscal_period_open
BEFORE INSERT OR UPDATE OF fiscal_period_id, journal_date ON public.journals
FOR EACH ROW
EXECUTE FUNCTION public.enforce_fiscal_period_open();

-- 4) دمج Triggers المكررة: حذف protect_posted_journal* والاكتفاء بـ prevent_posted_*
DROP TRIGGER IF EXISTS trg_protect_posted_journal ON public.journals;
DROP TRIGGER IF EXISTS trg_protect_posted_journal_lines ON public.journal_entries;
DROP FUNCTION IF EXISTS public.protect_posted_journal();
DROP FUNCTION IF EXISTS public.protect_posted_journal_lines();

-- 5) Unique constraint على document_posting_log لضمان idempotency (event-based)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public'
      AND indexname='uq_dpl_source_event'
  ) THEN
    CREATE UNIQUE INDEX uq_dpl_source_event
      ON public.document_posting_log (tenant_id, document_type, document_id, COALESCE(reason,''))
      WHERE status = 'posted';
  END IF;
END $$;
