
CREATE OR REPLACE FUNCTION public.get_sidebar_counts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _tenant_id UUID;
  _user_id UUID;
  _result jsonb;
  _low_stock_count INTEGER;
BEGIN
  _tenant_id := get_current_tenant();
  _user_id := auth.uid();
  
  -- Calculate low stock count server-side
  SELECT COUNT(*) INTO _low_stock_count
  FROM products p
  WHERE p.tenant_id = _tenant_id
    AND p.min_stock IS NOT NULL
    AND (
      SELECT COALESCE(SUM(ps.quantity), 0)
      FROM product_stock ps
      WHERE ps.product_id = p.id
    ) < p.min_stock;

  SELECT jsonb_build_object(
    'pending_invoices', (
      SELECT COUNT(*) FROM invoices 
      WHERE tenant_id = _tenant_id AND payment_status IN ('pending', 'partial')
    ),
    'pending_sales_orders', (
      SELECT COUNT(*) FROM sales_orders 
      WHERE tenant_id = _tenant_id AND status IN ('pending', 'draft')
    ),
    'unread_notifications', (
      SELECT COUNT(*) FROM notifications 
      WHERE user_id = _user_id AND is_read = false AND tenant_id = _tenant_id
    ),
    'low_stock_alerts', _low_stock_count,
    'open_tasks', (
      SELECT COUNT(*) FROM tasks 
      WHERE tenant_id = _tenant_id AND is_completed = false
    ),
    'pending_quotations', (
      SELECT COUNT(*) FROM quotations 
      WHERE tenant_id = _tenant_id AND status IN ('pending', 'draft')
    ),
    'pending_purchase_orders', (
      SELECT COUNT(*) FROM purchase_orders 
      WHERE tenant_id = _tenant_id AND status IN ('pending', 'draft')
    )
  ) INTO _result;

  RETURN _result;
END;
$function$;
