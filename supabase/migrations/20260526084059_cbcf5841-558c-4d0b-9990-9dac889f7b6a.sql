
CREATE OR REPLACE FUNCTION public.log_posting_failure(
  p_tenant uuid, p_doc_type text, p_doc_id uuid, p_event text, p_reason text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.document_posting_log(
    tenant_id, document_type, document_id, status, reason, created_by
  ) VALUES (
    p_tenant, p_doc_type, p_doc_id, 'failed',
    COALESCE(p_event,'') || ': ' || COALESCE(p_reason,''),
    auth.uid()
  );
END;
$$;
REVOKE EXECUTE ON FUNCTION public.log_posting_failure(uuid,text,uuid,text,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.log_posting_failure(uuid,text,uuid,text,text) TO service_role;

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

      INSERT INTO public.journal_entries(
        tenant_id, journal_id, account_id, line_number, debit_amount, credit_amount, memo
      ) VALUES (
        v_tenant, v_journal_id, v_account_id, v_line_no,
        CASE WHEN v_side='debit'  THEN v_amount ELSE 0 END,
        CASE WHEN v_side='credit' THEN v_amount ELSE 0 END,
        v_line->>'memo'
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

INSERT INTO public.chart_of_accounts (tenant_id, code, name, account_type, normal_balance, is_active)
SELECT t.id, v.code, v.name, v.atype::account_type, v.nbal::balance_type, true
  FROM public.tenants t
 CROSS JOIN (VALUES
   ('1250','حساب تسوية استلام البضاعة (GR/IR)','asset','debit'),
   ('1290','ضريبة المدخلات','asset','debit'),
   ('5100','تسويات المخزون','expense','debit')
 ) AS v(code, name, atype, nbal)
ON CONFLICT DO NOTHING;
