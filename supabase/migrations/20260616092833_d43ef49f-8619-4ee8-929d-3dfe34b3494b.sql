-- Revoke anon execute from 5 critical functions
REVOKE EXECUTE ON FUNCTION public.save_invoice_with_items(uuid, jsonb, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_quotation_with_items(uuid, jsonb, jsonb) FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_low_stock_products() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_monthly_sales_decline() FROM anon, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_unpaid_invoices_summary() FROM anon, PUBLIC;

-- Re-grant explicit access to authenticated and service_role
GRANT EXECUTE ON FUNCTION public.save_invoice_with_items(uuid, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.save_quotation_with_items(uuid, jsonb, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_low_stock_products() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_monthly_sales_decline() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_unpaid_invoices_summary() TO authenticated, service_role;