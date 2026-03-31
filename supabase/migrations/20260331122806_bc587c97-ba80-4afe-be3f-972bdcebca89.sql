CREATE OR REPLACE FUNCTION public.get_customer_stats()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'individuals', COUNT(*) FILTER (WHERE customer_type = 'individual'),
    'companies', COUNT(*) FILTER (WHERE customer_type = 'company'),
    'farms', COUNT(*) FILTER (WHERE customer_type = 'farm'),
    'vip', COUNT(*) FILTER (WHERE vip_level != 'regular'),
    'active', COUNT(*) FILTER (WHERE is_active = true),
    'inactive', COUNT(*) FILTER (WHERE is_active = false),
    'total_balance', COALESCE(SUM(current_balance), 0),
    'debtors', COUNT(*) FILTER (WHERE current_balance > 0)
  )
  FROM customers
  WHERE tenant_id = get_current_tenant()
$$;