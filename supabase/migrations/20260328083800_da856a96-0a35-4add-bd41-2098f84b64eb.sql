
-- Atomic supplier balance update function
CREATE OR REPLACE FUNCTION public.atomic_supplier_balance_update(_supplier_id uuid, _amount numeric)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE suppliers 
  SET current_balance = COALESCE(current_balance, 0) - _amount
  WHERE id = _supplier_id;
END;
$$;
