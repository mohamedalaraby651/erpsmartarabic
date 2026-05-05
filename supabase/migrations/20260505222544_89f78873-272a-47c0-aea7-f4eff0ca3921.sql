-- Phase A: Revoke from PUBLIC and anon for ALL SECURITY DEFINER functions in public schema
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM PUBLIC;', r.name, r.args);
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM anon;', r.name, r.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;

-- Phase B: Revoke from authenticated for internal-only functions (triggers + helpers)
DO $$
DECLARE
  r record;
  internal_names text[] := ARRAY[
    '_has_posted_journal',
    'auto_assign_default_tenant',
    'batch_validate_delete',
    'claim_pending_events',
    'decrypt_totp_secret',
    'emit_customer_credit_exceeded',
    'emit_event',
    'emit_expense_approved',
    'emit_invoice_approved',
    'emit_payment_received',
    'emit_stock_depleted',
    'handle_new_user',
    'invalidate_permission_cache',
    'is_admin_equivalent_custom_role',
    'log_activity',
    'log_bulk_operation',
    'log_slow_query',
    'mark_event_processed',
    'prevent_approved_invoice_mutation',
    'prevent_posted_expense_mutation',
    'prevent_posted_journal_entry_mutation',
    'prevent_posted_journal_mutation',
    'prevent_posted_payment_mutation',
    'purge_old_audit_records',
    'record_event_metric',
    'refresh_customer_stats_mv',
    'refresh_enterprise_mvs',
    'reverse_invoice_on_delete',
    'reverse_payment_on_delete',
    'set_supplier_notes_tenant',
    'set_tenant_id_default',
    'toggle_tenant_status',
    'track_changes',
    'update_customer_activity_on_payment',
    'update_customer_balance_on_invoice',
    'update_customer_cached_stats',
    'update_customer_last_communication',
    'update_tenant_subscription',
    'admin_requeue_event',
    'get_all_tenants_admin',
    'get_platform_stats'
  ];
BEGIN
  FOR r IN
    SELECT p.proname AS name, pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
      AND p.proname = ANY(internal_names)
  LOOP
    BEGIN
      EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated;', r.name, r.args);
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END LOOP;
END $$;
