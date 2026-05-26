
-- ============== Cost Centers ==============
CREATE TABLE public.tenant_cost_centers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  parent_id uuid REFERENCES public.tenant_cost_centers(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_cost_centers TO authenticated;
GRANT ALL ON public.tenant_cost_centers TO service_role;
ALTER TABLE public.tenant_cost_centers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cc_select" ON public.tenant_cost_centers FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());
CREATE POLICY "cc_insert" ON public.tenant_cost_centers FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','create'));
CREATE POLICY "cc_update" ON public.tenant_cost_centers FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','edit'))
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','edit'));
CREATE POLICY "cc_delete" ON public.tenant_cost_centers FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','delete'));

CREATE INDEX idx_cc_tenant_active ON public.tenant_cost_centers(tenant_id, is_active);
CREATE INDEX idx_cc_parent ON public.tenant_cost_centers(parent_id);

-- ============== Projects ==============
CREATE TABLE public.tenant_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name_ar text NOT NULL,
  name_en text,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'active',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_projects TO authenticated;
GRANT ALL ON public.tenant_projects TO service_role;
ALTER TABLE public.tenant_projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pr_select" ON public.tenant_projects FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());
CREATE POLICY "pr_insert" ON public.tenant_projects FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','create'));
CREATE POLICY "pr_update" ON public.tenant_projects FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','edit'))
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','edit'));
CREATE POLICY "pr_delete" ON public.tenant_projects FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','delete'));

CREATE INDEX idx_pr_tenant_status ON public.tenant_projects(tenant_id, status);

-- ============== Departments ==============
CREATE TABLE public.tenant_departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL,
  code text NOT NULL,
  name_ar text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  UNIQUE (tenant_id, code)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tenant_departments TO authenticated;
GRANT ALL ON public.tenant_departments TO service_role;
ALTER TABLE public.tenant_departments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "dp_select" ON public.tenant_departments FOR SELECT TO authenticated
  USING (tenant_id = get_current_tenant());
CREATE POLICY "dp_insert" ON public.tenant_departments FOR INSERT TO authenticated
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','create'));
CREATE POLICY "dp_update" ON public.tenant_departments FOR UPDATE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','edit'))
  WITH CHECK (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','edit'));
CREATE POLICY "dp_delete" ON public.tenant_departments FOR DELETE TO authenticated
  USING (tenant_id = get_current_tenant() AND check_section_permission(auth.uid(),'accounting','delete'));

CREATE INDEX idx_dp_tenant_active ON public.tenant_departments(tenant_id, is_active);

-- ============== Journal entry dimension columns ==============
ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS cost_center_id uuid REFERENCES public.tenant_cost_centers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.tenant_projects(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES public.tenant_departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_je_tenant_cc ON public.journal_entries(tenant_id, cost_center_id) WHERE cost_center_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_je_tenant_project ON public.journal_entries(tenant_id, project_id) WHERE project_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_je_tenant_dept ON public.journal_entries(tenant_id, department_id) WHERE department_id IS NOT NULL;

-- ============== post_document_atomic v2: dimension-aware ==============
CREATE OR REPLACE FUNCTION public.post_document_atomic(
  p_event text, p_source_type text, p_source_id uuid, p_context jsonb
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_tenant uuid; v_existing uuid; v_journal_id uuid; v_period_id uuid;
  v_journal_date date; v_journal_number text;
  v_lines jsonb; v_line jsonb;
  v_account_id uuid; v_account_code text;
  v_amount numeric(15,2); v_side text;
  v_total_debit numeric(15,2) := 0; v_total_credit numeric(15,2) := 0;
  v_line_no int := 0; v_description text;
  v_cc uuid; v_pr uuid; v_dp uuid;
BEGIN
  v_tenant := COALESCE(NULLIF(p_context->>'tenant_id','')::uuid, get_current_tenant());
  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'لا يمكن تحديد المستأجر للترحيل' USING ERRCODE = 'check_violation';
  END IF;

  SELECT journal_id INTO v_existing
    FROM public.document_posting_log
   WHERE tenant_id = v_tenant AND document_type = p_source_type
     AND document_id = p_source_id
     AND COALESCE(reason,'') = COALESCE(p_event,'')
     AND status = 'posted'
   LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN v_existing; END IF;

  v_lines        := COALESCE(p_context->'lines','[]'::jsonb);
  v_journal_date := COALESCE((p_context->>'journal_date')::date, CURRENT_DATE);
  v_description  := COALESCE(p_context->>'description', p_event);

  IF jsonb_array_length(v_lines) < 2 THEN
    RAISE EXCEPTION 'يجب توفير سطرين محاسبيين على الأقل' USING ERRCODE = 'check_violation';
  END IF;

  SELECT id INTO v_period_id FROM public.fiscal_periods
   WHERE tenant_id = v_tenant
     AND v_journal_date BETWEEN start_date AND end_date
     AND status = 'open'
   ORDER BY start_date DESC LIMIT 1;
  IF v_period_id IS NULL THEN
    RAISE EXCEPTION 'لا توجد فترة محاسبية مفتوحة للتاريخ %', v_journal_date USING ERRCODE = 'check_violation';
  END IF;

  v_journal_number := 'JV-' || to_char(v_journal_date,'YYYYMMDD') || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,8);

  BEGIN
    INSERT INTO public.journals(
      tenant_id, fiscal_period_id, journal_number, journal_date, description,
      is_posted, posted_at, source_type, source_id, created_by
    ) VALUES (
      v_tenant, v_period_id, v_journal_number, v_journal_date, v_description,
      true, now(), p_source_type, p_source_id, auth.uid()
    ) RETURNING id INTO v_journal_id;

    FOR v_line IN SELECT * FROM jsonb_array_elements(v_lines) LOOP
      v_line_no := v_line_no + 1;
      v_account_code := v_line->>'account_code';
      v_side := lower(v_line->>'side');
      v_amount := round(COALESCE((v_line->>'amount')::numeric, 0), 2);
      IF v_amount <= 0 THEN CONTINUE; END IF;

      SELECT pam.account_id INTO v_account_id
        FROM public.posting_account_map pam
       WHERE pam.tenant_id = v_tenant AND pam.posting_key = v_account_code
       LIMIT 1;
      IF v_account_id IS NULL THEN
        SELECT coa.id INTO v_account_id
          FROM public.chart_of_accounts coa
         WHERE coa.tenant_id = v_tenant AND coa.code = v_account_code
         LIMIT 1;
      END IF;
      IF v_account_id IS NULL THEN
        RAISE EXCEPTION 'لم يتم العثور على الحساب: %', v_account_code USING ERRCODE = 'check_violation';
      END IF;

      v_cc := NULLIF(v_line->>'cost_center_id','')::uuid;
      v_pr := NULLIF(v_line->>'project_id','')::uuid;
      v_dp := NULLIF(v_line->>'department_id','')::uuid;

      INSERT INTO public.journal_entries(
        tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo,
        cost_center_id, project_id, department_id
      ) VALUES (
        v_tenant, v_journal_id, v_account_id, v_line_no,
        CASE WHEN v_side='debit'  THEN v_amount ELSE 0 END,
        CASE WHEN v_side='credit' THEN v_amount ELSE 0 END,
        v_line->>'memo',
        v_cc, v_pr, v_dp
      );

      IF v_side='debit'  THEN v_total_debit  := round(v_total_debit + v_amount, 2); END IF;
      IF v_side='credit' THEN v_total_credit := round(v_total_credit + v_amount, 2); END IF;
    END LOOP;

    IF abs(v_total_debit - v_total_credit) > 0.01 THEN
      RAISE EXCEPTION 'القيد غير متوازن: مدين=% / دائن=%', v_total_debit, v_total_credit USING ERRCODE = 'check_violation';
    END IF;

    UPDATE public.journals SET total_debit = v_total_debit, total_credit = v_total_credit WHERE id = v_journal_id;

    INSERT INTO public.document_posting_log(
      tenant_id, document_type, document_id, journal_id, status, reason, total_amount, created_by
    ) VALUES (
      v_tenant, p_source_type, p_source_id, v_journal_id, 'posted', p_event, v_total_debit, auth.uid()
    );

    RETURN v_journal_id;
  EXCEPTION WHEN OTHERS THEN
    PERFORM public.log_posting_failure(v_tenant, p_source_type, p_source_id, p_event, SQLERRM);
    RAISE;
  END;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.post_document_atomic(text,text,uuid,jsonb) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.post_document_atomic(text,text,uuid,jsonb) TO authenticated, service_role;
