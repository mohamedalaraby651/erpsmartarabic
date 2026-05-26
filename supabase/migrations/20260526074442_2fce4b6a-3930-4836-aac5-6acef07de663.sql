-- Trigger-only functions: revoke from everyone (called by Postgres internally)
REVOKE EXECUTE ON FUNCTION public.fn_log_pdf_profile_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_sync_pdf_asset_ref_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_posted_journal() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_posted_journal_lines() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prune_expired_idempotency() FROM PUBLIC, anon, authenticated;

-- User-facing RPCs: revoke anon only, keep authenticated
REVOKE EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_journal_reversal(uuid, text, date) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_low_stock_products() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_monthly_sales_decline() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_unpaid_invoices_summary() FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_invoice_with_items(uuid, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.save_quotation_with_items(uuid, jsonb, jsonb) FROM anon;
REVOKE EXECUTE ON FUNCTION public.validate_ledger_integrity(uuid) FROM anon;

-- Re-affirm authenticated grant for safety on user-facing RPCs
GRANT EXECUTE ON FUNCTION public.admin_set_user_active(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_journal_reversal(uuid, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_low_stock_products() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_sales_decline() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unpaid_invoices_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_invoice_with_items(uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.save_quotation_with_items(uuid, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_ledger_integrity(uuid) TO authenticated;