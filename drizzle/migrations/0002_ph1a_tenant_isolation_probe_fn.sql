-- PH1A-NAZRA-001 · BND-05 — X-7 evidence generator.
-- Reproducible cross-tenant denial probe. Everything it does is executed in a
-- subtransaction that is ALWAYS rolled back; only the measured counters
-- survive (PL/pgSQL variables are not transactional).
-- NOT exposed to clients: EXECUTE is revoked from anon/authenticated.
CREATE OR REPLACE FUNCTION public.ph1a_cross_tenant_probe(_tables text[] DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid;
  home uuid;
  probe uuid := '00000000-0000-4000-8000-0000000000ff';
  tbl text;
  vis bigint;
  upd bigint;
  del bigint;
  ins_denied boolean;
  ins_note text;
  src_exists boolean;
  out jsonb := '[]'::jsonb;
  tables text[] := COALESCE(_tables, ARRAY[
    'customers','invoices','invoice_items','payments','products','product_stock',
    'stock_movements','journals','journal_entries','expenses','suppliers',
    'purchase_orders','quotations','employees','activity_logs','audit_trail',
    'chart_of_accounts','notifications']);
BEGIN
  SELECT user_id, tenant_id INTO actor, home FROM public.user_tenants LIMIT 1;
  IF actor IS NULL THEN
    RETURN jsonb_build_object('supported', false, 'reason', 'no user_tenants row');
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    vis := NULL; upd := NULL; del := NULL; ins_denied := NULL; ins_note := NULL;
    BEGIN
      INSERT INTO public.tenants (id, name, slug) VALUES (probe, 'PH1A probe', 'ph1a-probe');
      UPDATE public.user_tenants SET tenant_id = probe WHERE user_id = actor;
      PERFORM set_config('role', 'authenticated', true);
      PERFORM set_config('request.jwt.claims',
        json_build_object('sub', actor, 'role', 'authenticated')::text, true);

      EXECUTE format('SELECT count(*) FROM public.%I WHERE tenant_id = $1', tbl)
        INTO vis USING home;
      EXECUTE format(
        'WITH u AS (UPDATE public.%I SET tenant_id = tenant_id WHERE tenant_id = $1 RETURNING 1)'
        || ' SELECT count(*) FROM u', tbl) INTO upd USING home;
      EXECUTE format(
        'WITH d AS (DELETE FROM public.%I WHERE tenant_id = $1 RETURNING 1)'
        || ' SELECT count(*) FROM d', tbl) INTO del USING home;

      RAISE EXCEPTION 'PH1A_PROBE_ROLLBACK';
    EXCEPTION WHEN OTHERS THEN
      IF SQLERRM <> 'PH1A_PROBE_ROLLBACK' THEN
        ins_note := 'rw probe error: ' || SQLERRM;
      END IF;
    END;

    -- INSERT probe: constraint-safe clone of a real row of the foreign tenant.
    EXECUTE format('SELECT EXISTS (SELECT 1 FROM public.%I WHERE tenant_id = $1)', tbl)
      INTO src_exists USING home;
    IF src_exists THEN
      BEGIN
        INSERT INTO public.tenants (id, name, slug) VALUES (probe, 'PH1A probe', 'ph1a-probe');
        UPDATE public.user_tenants SET tenant_id = probe WHERE user_id = actor;
        EXECUTE format(
          'CREATE TEMP TABLE _ph1a_src AS SELECT * FROM public.%I WHERE tenant_id = $1 LIMIT 1', tbl)
          USING home;
        EXECUTE 'UPDATE _ph1a_src SET id = gen_random_uuid()';
        PERFORM set_config('role', 'authenticated', true);
        PERFORM set_config('request.jwt.claims',
          json_build_object('sub', actor, 'role', 'authenticated')::text, true);
        EXECUTE format('INSERT INTO public.%I SELECT * FROM _ph1a_src', tbl);
        ins_denied := false;
        ins_note := 'INSERT with foreign tenant_id SUCCEEDED — VIOLATION';
        RAISE EXCEPTION 'PH1A_PROBE_ROLLBACK';
      EXCEPTION WHEN OTHERS THEN
        IF SQLERRM <> 'PH1A_PROBE_ROLLBACK' THEN
          ins_denied := (SQLSTATE = '42501' OR SQLERRM ILIKE '%row-level security%');
          ins_note := SQLERRM;
        END IF;
      END;
      BEGIN
        EXECUTE 'DROP TABLE IF EXISTS _ph1a_src';
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
    ELSE
      ins_note := 'no source row for this tenant — insert probe not applicable';
    END IF;

    out := out || jsonb_build_object(
      'table_name', tbl,
      'foreign_rows_visible', vis,
      'update_affected', upd,
      'delete_affected', del,
      'select_denied', vis = 0,
      'update_denied', upd = 0,
      'delete_denied', del = 0,
      'insert_denied', ins_denied,
      'note', ins_note);
  END LOOP;

  RETURN jsonb_build_object('supported', true, 'actor', actor, 'homeTenant', home,
                            'probeTenant', probe, 'results', out);
END;
$$;

REVOKE ALL ON FUNCTION public.ph1a_cross_tenant_probe(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ph1a_cross_tenant_probe(text[]) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ph1a_cross_tenant_probe(text[]) TO service_role;
