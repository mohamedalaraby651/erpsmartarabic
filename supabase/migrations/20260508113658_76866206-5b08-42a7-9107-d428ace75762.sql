
ALTER TABLE public.journals
  ADD COLUMN IF NOT EXISTS reversed_by_journal_id uuid REFERENCES public.journals(id),
  ADD COLUMN IF NOT EXISTS reverses_journal_id uuid REFERENCES public.journals(id);

CREATE INDEX IF NOT EXISTS idx_journals_reversed_by ON public.journals(reversed_by_journal_id);
CREATE INDEX IF NOT EXISTS idx_journals_reverses ON public.journals(reverses_journal_id);

CREATE OR REPLACE FUNCTION public.protect_posted_journal()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.is_posted = true THEN
      RAISE EXCEPTION 'لا يمكن حذف قيد مُرحَّل. استخدم قيد عكس بدلاً من ذلك.' USING ERRCODE = 'P0001';
    END IF;
    RETURN OLD;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.is_posted = true THEN
    IF NEW.id              IS DISTINCT FROM OLD.id              OR
       NEW.tenant_id       IS DISTINCT FROM OLD.tenant_id       OR
       NEW.fiscal_period_id IS DISTINCT FROM OLD.fiscal_period_id OR
       NEW.journal_number  IS DISTINCT FROM OLD.journal_number  OR
       NEW.journal_date    IS DISTINCT FROM OLD.journal_date    OR
       NEW.description     IS DISTINCT FROM OLD.description     OR
       NEW.is_posted       IS DISTINCT FROM OLD.is_posted       OR
       NEW.posted_at       IS DISTINCT FROM OLD.posted_at       OR
       NEW.created_by      IS DISTINCT FROM OLD.created_by      OR
       NEW.source_type     IS DISTINCT FROM OLD.source_type     OR
       NEW.source_id       IS DISTINCT FROM OLD.source_id       OR
       NEW.total_debit     IS DISTINCT FROM OLD.total_debit     OR
       NEW.total_credit    IS DISTINCT FROM OLD.total_credit    OR
       NEW.created_at      IS DISTINCT FROM OLD.created_at      OR
       NEW.reverses_journal_id IS DISTINCT FROM OLD.reverses_journal_id
    THEN
      RAISE EXCEPTION 'لا يمكن تعديل قيد مُرحَّل. القيود المرحَّلة محصَّنة (immutable). استخدم قيد عكس.' USING ERRCODE = 'P0001';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_posted_journal ON public.journals;
CREATE TRIGGER trg_protect_posted_journal
BEFORE UPDATE OR DELETE ON public.journals
FOR EACH ROW EXECUTE FUNCTION public.protect_posted_journal();

CREATE OR REPLACE FUNCTION public.protect_posted_journal_lines()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _is_posted boolean;
BEGIN
  SELECT is_posted INTO _is_posted FROM public.journals WHERE id = COALESCE(NEW.journal_id, OLD.journal_id);
  IF _is_posted = true THEN
    RAISE EXCEPTION 'لا يمكن تعديل أو حذف سطور قيد مُرحَّل (immutable ledger).' USING ERRCODE = 'P0001';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_posted_journal_lines ON public.journal_entries;
CREATE TRIGGER trg_protect_posted_journal_lines
BEFORE UPDATE OR DELETE ON public.journal_entries
FOR EACH ROW EXECUTE FUNCTION public.protect_posted_journal_lines();

CREATE TABLE IF NOT EXISTS public.journal_reversals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL DEFAULT public.get_current_tenant(),
  original_journal_id uuid NOT NULL REFERENCES public.journals(id),
  reversal_journal_id uuid NOT NULL REFERENCES public.journals(id),
  reason text NOT NULL,
  reversed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT journal_reversals_unique_original UNIQUE (original_journal_id)
);

CREATE INDEX IF NOT EXISTS idx_journal_reversals_tenant ON public.journal_reversals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journal_reversals_reversal ON public.journal_reversals(reversal_journal_id);

ALTER TABLE public.journal_reversals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_select_journal_reversals" ON public.journal_reversals;
CREATE POLICY "tenant_select_journal_reversals" ON public.journal_reversals
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_current_tenant());

CREATE OR REPLACE FUNCTION public.protect_journal_reversals_append_only()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'journal_reversals جدول append-only — لا يمكن التعديل أو الحذف.' USING ERRCODE = 'P0001';
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_reversals_append_only ON public.journal_reversals;
CREATE TRIGGER trg_journal_reversals_append_only
BEFORE UPDATE OR DELETE ON public.journal_reversals
FOR EACH ROW EXECUTE FUNCTION public.protect_journal_reversals_append_only();

CREATE OR REPLACE FUNCTION public.validate_ledger_integrity(_tenant_id uuid DEFAULT NULL)
RETURNS TABLE (check_name text, status text, failing_count bigint, details jsonb)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _t uuid := COALESCE(_tenant_id, public.get_current_tenant());
BEGIN
  RETURN QUERY
  WITH agg AS (
    SELECT j.id AS journal_id,
           ROUND(SUM(je.debit_amount)::numeric, 2)  AS d,
           ROUND(SUM(je.credit_amount)::numeric, 2) AS c
    FROM public.journals j
    JOIN public.journal_entries je ON je.journal_id = j.id
    WHERE (_t IS NULL OR j.tenant_id = _t)
    GROUP BY j.id
  ), unbalanced AS (SELECT journal_id, d, c FROM agg WHERE d <> c)
  SELECT 'debit_equals_credit'::text,
         CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END,
         COUNT(*),
         COALESCE(jsonb_agg(jsonb_build_object('journal_id', journal_id, 'debit', d, 'credit', c)) FILTER (WHERE journal_id IS NOT NULL), '[]'::jsonb)
  FROM unbalanced;

  RETURN QUERY
  SELECT 'no_orphan_lines'::text,
         CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END,
         COUNT(*),
         COALESCE(jsonb_agg(jsonb_build_object('line_id', je.id)) FILTER (WHERE je.id IS NOT NULL), '[]'::jsonb)
  FROM public.journal_entries je
  LEFT JOIN public.journals j ON j.id = je.journal_id
  WHERE j.id IS NULL AND (_t IS NULL OR je.tenant_id = _t);

  RETURN QUERY
  SELECT 'posted_journals_have_lines'::text,
         CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END,
         COUNT(*),
         COALESCE(jsonb_agg(jsonb_build_object('journal_id', j.id)) FILTER (WHERE j.id IS NOT NULL), '[]'::jsonb)
  FROM public.journals j
  WHERE j.is_posted = true
    AND (_t IS NULL OR j.tenant_id = _t)
    AND NOT EXISTS (SELECT 1 FROM public.journal_entries je WHERE je.journal_id = j.id);

  RETURN QUERY
  WITH agg AS (
    SELECT j.id, j.total_debit, j.total_credit,
           ROUND(SUM(je.debit_amount)::numeric, 2)  AS sd,
           ROUND(SUM(je.credit_amount)::numeric, 2) AS sc
    FROM public.journals j
    JOIN public.journal_entries je ON je.journal_id = j.id
    WHERE (_t IS NULL OR j.tenant_id = _t)
    GROUP BY j.id
  ), mismatched AS (
    SELECT id FROM agg
    WHERE ROUND(total_debit::numeric, 2) <> sd OR ROUND(total_credit::numeric, 2) <> sc
  )
  SELECT 'stored_totals_match_lines'::text,
         CASE WHEN COUNT(*) = 0 THEN 'pass' ELSE 'fail' END,
         COUNT(*),
         COALESCE(jsonb_agg(jsonb_build_object('journal_id', id)) FILTER (WHERE id IS NOT NULL), '[]'::jsonb)
  FROM mismatched;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_ledger_integrity(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_ledger_integrity(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.create_journal_reversal(
  _original_journal_id uuid,
  _reason text,
  _reversal_date date DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _tenant uuid := public.get_current_tenant();
  _orig public.journals%ROWTYPE;
  _new_id uuid;
BEGIN
  IF _tenant IS NULL THEN RAISE EXCEPTION 'لا يوجد سياق tenant صالح.' USING ERRCODE = 'P0001'; END IF;
  IF _reason IS NULL OR length(trim(_reason)) < 5 THEN
    RAISE EXCEPTION 'يجب توفير سبب واضح للعكس (5 أحرف على الأقل).' USING ERRCODE = 'P0001';
  END IF;

  SELECT * INTO _orig FROM public.journals WHERE id = _original_journal_id AND tenant_id = _tenant;
  IF _orig.id IS NULL THEN RAISE EXCEPTION 'القيد الأصلي غير موجود.' USING ERRCODE = 'P0002'; END IF;
  IF _orig.is_posted <> true THEN RAISE EXCEPTION 'لا يمكن عكس قيد غير مُرحَّل.' USING ERRCODE = 'P0001'; END IF;
  IF _orig.reversed_by_journal_id IS NOT NULL THEN RAISE EXCEPTION 'هذا القيد سبق عكسه.' USING ERRCODE = 'P0001'; END IF;

  INSERT INTO public.journals (
    tenant_id, fiscal_period_id, journal_number, journal_date, description,
    is_posted, posted_at, created_by, source_type, source_id,
    total_debit, total_credit, reverses_journal_id
  ) VALUES (
    _tenant, _orig.fiscal_period_id, 'REV-' || _orig.journal_number,
    COALESCE(_reversal_date, CURRENT_DATE),
    'عكس قيد ' || _orig.journal_number || ' — ' || _reason,
    true, now(), auth.uid(), 'reversal', _orig.id,
    _orig.total_credit, _orig.total_debit, _orig.id
  ) RETURNING id INTO _new_id;

  INSERT INTO public.journal_entries (journal_id, account_id, line_number, debit_amount, credit_amount, memo, tenant_id)
  SELECT _new_id, account_id, line_number, credit_amount, debit_amount,
         'عكس: ' || COALESCE(memo, ''), _tenant
  FROM public.journal_entries WHERE journal_id = _orig.id ORDER BY line_number;

  UPDATE public.journals SET reversed_by_journal_id = _new_id WHERE id = _orig.id;

  INSERT INTO public.journal_reversals (tenant_id, original_journal_id, reversal_journal_id, reason, reversed_by)
  VALUES (_tenant, _orig.id, _new_id, _reason, auth.uid());

  RETURN _new_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_journal_reversal(uuid, text, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_journal_reversal(uuid, text, date) TO authenticated;

COMMENT ON FUNCTION public.protect_posted_journal() IS 'Immutable ledger guard — prevents UPDATE/DELETE on posted journals (only reversed_by_journal_id linkage permitted).';
COMMENT ON FUNCTION public.protect_posted_journal_lines() IS 'Immutable ledger guard — prevents UPDATE/DELETE on lines of posted journals.';
COMMENT ON TABLE public.journal_reversals IS 'Append-only audit trail of all journal reversals.';
COMMENT ON FUNCTION public.create_journal_reversal(uuid, text, date) IS 'Sole sanctioned mechanism for reversing posted journals.';
