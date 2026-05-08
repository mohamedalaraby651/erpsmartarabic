
-- =====================================================================
-- Phase 1.A — Revoke EXECUTE on all SECURITY DEFINER functions from
-- anon and PUBLIC. Selectively re-grant to authenticated for the ones
-- that the application actually invokes via supabase.rpc().
-- Trigger-only and internal helper functions stay locked down.
-- =====================================================================

DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
  LOOP
    EXECUTE format(
      'REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC, anon',
      r.proname, r.args
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Re-grant EXECUTE to authenticated for functions invoked from the app
-- (RPC calls, RLS helpers used inside policies, dashboard helpers).
-- ---------------------------------------------------------------------
DO $$
DECLARE
  fn text;
  args text;
  full_sig text;
BEGIN
  FOR fn, args IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname = ANY (ARRAY[
        -- RLS / permission helpers (called inside policies)
        'has_role','has_any_role','is_admin_equivalent_custom_role',
        'is_platform_admin','is_tenant_member','get_platform_role',
        'get_current_tenant','get_user_tenants',
        'check_section_permission','check_financial_limit',
        'check_rate_limit','check_sod_violation',
        'compute_permission_matrix','get_permission_matrix',
        'needs_approval','get_approval_chain',
        'is_period_closed',
        -- Read-only dashboard / statement helpers
        'get_sidebar_counts','get_customer_stats',
        'get_customer_aging','get_customer_chart_data',
        'get_customer_financial_summary','get_customer_health_score',
        'get_customer_statement',
        'get_supplier_aging','get_supplier_chart_data',
        'get_supplier_financial_summary','get_supplier_health_score',
        'get_supplier_statement',
        'get_invoice_item_returnable',
        'get_ar_aging_mv','get_inventory_valuation_mv','get_sales_summary_mv',
        'get_platform_stats','get_all_tenants_admin',
        'find_duplicate_customers',
        -- Document conversions / posting actions invoked from UI
        'convert_quote_to_order','convert_order_to_invoice',
        'convert_invoice_to_delivery',
        'post_goods_receipt','post_delivery_note','post_purchase_invoice',
        'cancel_goods_receipt','cancel_delivery_note',
        'confirm_credit_note','cancel_credit_note',
        'merge_customers_atomic',
        'atomic_customer_balance_update','atomic_supplier_balance_update',
        'log_bulk_operation','log_slow_query'
      ])
  LOOP
    full_sig := format('public.%I(%s)', fn, args);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', full_sig);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- Belt-and-braces: revoke EXECUTE from authenticated for trigger-only
-- and internal helpers that should never be called directly.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  fn text;
  args text;
BEGIN
  FOR fn, args IN
    SELECT p.proname, pg_get_function_identity_arguments(p.oid)
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prosecdef = true
      AND p.proname = ANY (ARRAY[
        'apply_dn_stock_on_post','apply_gr_stock_on_post',
        'auto_assign_default_tenant','handle_new_user',
        'set_dn_item_tenant',
        'emit_event','emit_customer_credit_exceeded','emit_expense_approved',
        'emit_invoice_approved','emit_payment_received','emit_stock_depleted',
        'create_journal_for_credit_note','create_journal_for_delivery_note',
        'create_journal_for_expense','create_journal_for_goods_receipt',
        'create_journal_for_invoice','create_journal_for_payment',
        'create_journal_for_purchase_invoice',
        'reverse_journal_for_credit_note','reverse_invoice_on_delete',
        'reverse_payment_on_delete','reverse_stock_for_credit_note',
        'prevent_approved_invoice_mutation','prevent_posted_expense_mutation',
        'prevent_posted_journal_entry_mutation','prevent_posted_journal_mutation',
        'prevent_posted_payment_mutation',
        'log_activity','purge_old_audit_records',
        'invalidate_permission_cache',
        'refresh_customer_stats_mv','refresh_enterprise_mvs',
        'compute_three_way_matching',
        'ensure_credit_note_posting_accounts','ensure_logistics_posting_accounts',
        'resolve_posting_account',
        '_has_posted_journal','_resolve_open_period',
        'admin_requeue_event','claim_pending_events','mark_event_processed',
        'record_event_metric','batch_validate_delete',
        'gen_quote_number','decrypt_totp_secret'
      ])
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION public.%I(%s) FROM authenticated',
                   fn, args);
  END LOOP;
END $$;
