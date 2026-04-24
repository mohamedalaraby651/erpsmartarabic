CREATE OR REPLACE FUNCTION public.create_journal_for_expense(
  _expense_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _exp record;
  _expense_account_id uuid;
  _credit_account_id uuid;
  _credit_logical text;
  _journal_id uuid;
  _journal_no text;
  _period_id uuid;
  _existing_journal_id uuid;
BEGIN
  SELECT e.*, ec.account_id AS category_account_id, ec.name AS category_name
  INTO _exp
  FROM public.expenses e
  LEFT JOIN public.expense_categories ec ON ec.id = e.category_id
  WHERE e.id = _expense_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Expense not found';
  END IF;

  SELECT id INTO _existing_journal_id
  FROM public.journals
  WHERE source_type = 'expense' AND source_id = _expense_id
    AND tenant_id = _exp.tenant_id
  LIMIT 1;

  IF _existing_journal_id IS NOT NULL THEN
    RETURN jsonb_build_object('success', true, 'skipped', true, 'journal_id', _existing_journal_id);
  END IF;

  _expense_account_id := _exp.category_account_id;
  IF _expense_account_id IS NULL THEN
    SELECT id INTO _expense_account_id
    FROM public.chart_of_accounts
    WHERE tenant_id = _exp.tenant_id AND code = '5900'
    LIMIT 1;
  END IF;

  IF _expense_account_id IS NULL THEN
    RAISE EXCEPTION 'No expense account configured for tenant';
  END IF;

  _credit_logical := CASE
    WHEN _exp.payment_method IN ('cash', 'نقدي') THEN 'CASH'
    WHEN _exp.payment_method IN ('bank_transfer', 'card', 'تحويل', 'بطاقة') THEN 'BANK'
    ELSE 'CASH'
  END;

  SELECT pam.account_id INTO _credit_account_id
  FROM public.posting_account_map pam
  WHERE pam.tenant_id = _exp.tenant_id AND pam.posting_key = _credit_logical
  LIMIT 1;

  IF _credit_account_id IS NULL THEN
    SELECT pam.account_id INTO _credit_account_id
    FROM public.posting_account_map pam
    WHERE pam.tenant_id = _exp.tenant_id AND pam.posting_key = 'CASH'
    LIMIT 1;
  END IF;

  IF _credit_account_id IS NULL THEN
    RAISE EXCEPTION 'No CASH/BANK account in posting_account_map';
  END IF;

  SELECT id INTO _period_id
  FROM public.fiscal_periods
  WHERE tenant_id = _exp.tenant_id
    AND _exp.expense_date BETWEEN start_date AND end_date
    AND COALESCE(is_closed, false) = false
  LIMIT 1;

  IF _period_id IS NULL THEN
    RAISE EXCEPTION 'No open fiscal period for expense date %', _exp.expense_date;
  END IF;

  _journal_no := 'EXP-' || to_char(now(), 'YYYYMMDD') || '-' || substr(gen_random_uuid()::text, 1, 6);

  INSERT INTO public.journals (
    tenant_id, journal_number, journal_date, description,
    fiscal_period_id, source_type, source_id, is_posted, posted_at,
    total_debit, total_credit, created_by
  ) VALUES (
    _exp.tenant_id, _journal_no, _exp.expense_date,
    'مصروف ' || _exp.expense_number || COALESCE(' — ' || _exp.category_name, ''),
    _period_id, 'expense', _expense_id, true, now(),
    _exp.amount, _exp.amount, _exp.created_by
  ) RETURNING id INTO _journal_id;

  INSERT INTO public.journal_entries (
    tenant_id, journal_id, line_number, account_id, debit_amount, credit_amount, memo
  ) VALUES (
    _exp.tenant_id, _journal_id, 1, _expense_account_id,
    _exp.amount, 0,
    COALESCE(_exp.description, _exp.category_name, 'مصروف')
  );

  INSERT INTO public.journal_entries (
    tenant_id, journal_id, line_number, account_id, debit_amount, credit_amount, memo
  ) VALUES (
    _exp.tenant_id, _journal_id, 2, _credit_account_id,
    0, _exp.amount,
    'دفع ' || _exp.expense_number
  );

  RETURN jsonb_build_object(
    'success', true,
    'expense_id', _expense_id,
    'journal_id', _journal_id,
    'journal_number', _journal_no
  );
END;
$$;