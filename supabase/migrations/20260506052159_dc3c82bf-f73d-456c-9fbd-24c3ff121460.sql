CREATE OR REPLACE FUNCTION public.ensure_logistics_posting_accounts()
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _tenant uuid := get_current_tenant();
  _created jsonb := '[]'::jsonb;
  _linked  jsonb := '[]'::jsonb;
  _id uuid;
  _key text; _code text; _name text; _type text; _normal text;
  _row record;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _tenant IS NULL THEN RAISE EXCEPTION 'No tenant context'; END IF;

  -- Definitions: (posting_key, code, arabic_name, account_type, normal_balance)
  FOR _row IN
    SELECT * FROM (VALUES
      ('INVENTORY',         '1.1.4', 'المخزون',                  'asset',     'debit'),
      ('GR_IR_CLEARING',    '2.1.5', 'بضاعة في الطريق (وسيط)',   'liability', 'credit'),
      ('VAT_RECEIVABLE',    '1.1.6', 'ضريبة قيمة مضافة (مدخلات)','asset',     'debit'),
      ('PURCHASE_DISCOUNT', '4.2.2', 'خصم المشتريات المكتسب',    'revenue',   'credit')
    ) AS t(key, code, name, atype, nbalance)
  LOOP
    _key := _row.key; _code := _row.code; _name := _row.name; _type := _row.atype; _normal := _row.nbalance;

    -- Skip if already mapped
    IF EXISTS (SELECT 1 FROM public.posting_account_map WHERE tenant_id = _tenant AND posting_key = _key) THEN
      CONTINUE;
    END IF;

    -- Try find existing account by code
    SELECT id INTO _id FROM public.chart_of_accounts
      WHERE tenant_id = _tenant AND code = _code LIMIT 1;

    -- Create if missing
    IF _id IS NULL THEN
      INSERT INTO public.chart_of_accounts (tenant_id, code, name, account_type, normal_balance, is_active)
      VALUES (_tenant, _code, _name, _type::account_type, _normal::normal_balance_type, true)
      RETURNING id INTO _id;
      _created := _created || jsonb_build_object('key', _key, 'code', _code, 'name', _name);
    END IF;

    -- Map it
    INSERT INTO public.posting_account_map (tenant_id, posting_key, account_id, description)
    VALUES (_tenant, _key, _id, _name)
    ON CONFLICT DO NOTHING;
    _linked := _linked || jsonb_build_object('key', _key, 'account_id', _id);
  END LOOP;

  RETURN jsonb_build_object('success', true, 'created', _created, 'linked', _linked);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'sqlstate', SQLSTATE);
END $$;

REVOKE EXECUTE ON FUNCTION public.ensure_logistics_posting_accounts() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.ensure_logistics_posting_accounts() TO authenticated;