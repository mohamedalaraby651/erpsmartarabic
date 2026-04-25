
-- Confirm credit note: mark as confirmed and reduce customer balance
CREATE OR REPLACE FUNCTION public.confirm_credit_note(p_credit_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_user uuid;
  v_role text;
  v_cn record;
BEGIN
  v_user := auth.uid();
  v_tenant := public.get_current_tenant();
  
  IF v_user IS NULL OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  -- Get role
  SELECT role::text INTO v_role FROM public.user_roles 
  WHERE user_id = v_user AND (tenant_id = v_tenant OR tenant_id IS NULL)
  ORDER BY (tenant_id = v_tenant) DESC NULLS LAST LIMIT 1;
  
  IF v_role NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  -- Lock and read
  SELECT * INTO v_cn FROM public.credit_notes 
  WHERE id = p_credit_note_id AND tenant_id = v_tenant FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit note not found';
  END IF;
  
  IF v_cn.status <> 'draft' THEN
    RAISE EXCEPTION 'Only draft credit notes can be confirmed';
  END IF;
  
  -- Update status
  UPDATE public.credit_notes SET status = 'confirmed', updated_at = now() 
  WHERE id = p_credit_note_id;
  
  -- Reduce customer balance (credit reduces debt)
  UPDATE public.customers 
  SET current_balance = COALESCE(current_balance, 0) - v_cn.amount,
      updated_at = now()
  WHERE id = v_cn.customer_id AND tenant_id = v_tenant;
  
  RETURN jsonb_build_object('success', true, 'credit_note_id', p_credit_note_id);
END;
$$;

-- Cancel credit note
CREATE OR REPLACE FUNCTION public.cancel_credit_note(p_credit_note_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant uuid;
  v_user uuid;
  v_role text;
  v_cn record;
BEGIN
  v_user := auth.uid();
  v_tenant := public.get_current_tenant();
  
  IF v_user IS NULL OR v_tenant IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  
  SELECT role::text INTO v_role FROM public.user_roles 
  WHERE user_id = v_user AND (tenant_id = v_tenant OR tenant_id IS NULL)
  ORDER BY (tenant_id = v_tenant) DESC NULLS LAST LIMIT 1;
  
  IF v_role NOT IN ('admin', 'accountant') THEN
    RAISE EXCEPTION 'Insufficient privileges';
  END IF;
  
  SELECT * INTO v_cn FROM public.credit_notes 
  WHERE id = p_credit_note_id AND tenant_id = v_tenant FOR UPDATE;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credit note not found';
  END IF;
  
  IF v_cn.status = 'cancelled' THEN
    RAISE EXCEPTION 'Already cancelled';
  END IF;
  
  -- If was confirmed, reverse balance impact
  IF v_cn.status = 'confirmed' THEN
    UPDATE public.customers 
    SET current_balance = COALESCE(current_balance, 0) + v_cn.amount,
        updated_at = now()
    WHERE id = v_cn.customer_id AND tenant_id = v_tenant;
  END IF;
  
  UPDATE public.credit_notes SET status = 'cancelled', updated_at = now() 
  WHERE id = p_credit_note_id;
  
  RETURN jsonb_build_object('success', true, 'credit_note_id', p_credit_note_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.confirm_credit_note(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_credit_note(uuid) TO authenticated;
