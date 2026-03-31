
CREATE OR REPLACE FUNCTION public.atomic_customer_balance_update(_customer_id uuid, _amount numeric)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE customers 
  SET current_balance = COALESCE(current_balance, 0) - _amount
  WHERE id = _customer_id;
END;
$function$;
