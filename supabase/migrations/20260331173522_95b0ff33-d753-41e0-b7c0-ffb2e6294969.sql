
-- Hide MV from public API (security fix)
ALTER MATERIALIZED VIEW public.customer_stats_mv SET SCHEMA extensions;
-- Update the RPC to reference the new schema
CREATE OR REPLACE FUNCTION public.get_customer_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total', COALESCE(total, 0),
    'individuals', COALESCE(individuals, 0),
    'companies', COALESCE(companies, 0),
    'farms', COALESCE(farms, 0),
    'vip', COALESCE(vip, 0),
    'active', COALESCE(active, 0),
    'inactive', COALESCE(inactive, 0),
    'total_balance', COALESCE(total_balance, 0),
    'debtors', COALESCE(debtors, 0)
  )
  FROM extensions.customer_stats_mv
  WHERE tenant_id = get_current_tenant()
$$;

-- Update refresh function too
CREATE OR REPLACE FUNCTION public.refresh_customer_stats_mv()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY extensions.customer_stats_mv;
END;
$$;
