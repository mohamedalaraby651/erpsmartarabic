-- Fix log_activity function to handle tables without name fields
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _user_id UUID;
    _action TEXT;
    _old_values JSONB;
    _new_values JSONB;
    _entity_name TEXT;
    _new_jsonb JSONB;
    _old_jsonb JSONB;
BEGIN
    _user_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        _action := 'create';
        _new_jsonb := to_jsonb(NEW);
        _new_values := _new_jsonb;
        _old_values := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        _action := 'update';
        _old_jsonb := to_jsonb(OLD);
        _new_jsonb := to_jsonb(NEW);
        _old_values := _old_jsonb;
        _new_values := _new_jsonb;
    ELSIF TG_OP = 'DELETE' THEN
        _action := 'delete';
        _old_jsonb := to_jsonb(OLD);
        _old_values := _old_jsonb;
        _new_values := NULL;
        _new_jsonb := NULL;
    END IF;
    
    -- Try to get entity name from JSONB representation
    _entity_name := COALESCE(
        CASE WHEN _new_jsonb IS NOT NULL THEN
            CASE 
                WHEN _new_jsonb ? 'name' THEN _new_jsonb->>'name'
                WHEN _new_jsonb ? 'full_name' THEN _new_jsonb->>'full_name'
                WHEN _new_jsonb ? 'invoice_number' THEN _new_jsonb->>'invoice_number'
                WHEN _new_jsonb ? 'order_number' THEN _new_jsonb->>'order_number'
                WHEN _new_jsonb ? 'quotation_number' THEN _new_jsonb->>'quotation_number'
                WHEN _new_jsonb ? 'payment_number' THEN _new_jsonb->>'payment_number'
                WHEN _new_jsonb ? 'expense_number' THEN _new_jsonb->>'expense_number'
                WHEN _new_jsonb ? 'transaction_number' THEN _new_jsonb->>'transaction_number'
                WHEN _new_jsonb ? 'journal_number' THEN _new_jsonb->>'journal_number'
                WHEN _new_jsonb ? 'title' THEN _new_jsonb->>'title'
                WHEN _new_jsonb ? 'slug' THEN _new_jsonb->>'slug'
                WHEN _new_jsonb ? 'endpoint' THEN _new_jsonb->>'endpoint'
                WHEN _new_jsonb ? 'entity_type' THEN _new_jsonb->>'entity_type'
                ELSE NULL
            END
        ELSE NULL
        END,
        CASE WHEN _old_jsonb IS NOT NULL THEN
            CASE 
                WHEN _old_jsonb ? 'name' THEN _old_jsonb->>'name'
                WHEN _old_jsonb ? 'full_name' THEN _old_jsonb->>'full_name'
                WHEN _old_jsonb ? 'invoice_number' THEN _old_jsonb->>'invoice_number'
                WHEN _old_jsonb ? 'order_number' THEN _old_jsonb->>'order_number'
                WHEN _old_jsonb ? 'quotation_number' THEN _old_jsonb->>'quotation_number'
                WHEN _old_jsonb ? 'payment_number' THEN _old_jsonb->>'payment_number'
                WHEN _old_jsonb ? 'expense_number' THEN _old_jsonb->>'expense_number'
                WHEN _old_jsonb ? 'transaction_number' THEN _old_jsonb->>'transaction_number'
                WHEN _old_jsonb ? 'journal_number' THEN _old_jsonb->>'journal_number'
                WHEN _old_jsonb ? 'title' THEN _old_jsonb->>'title'
                WHEN _old_jsonb ? 'slug' THEN _old_jsonb->>'slug'
                WHEN _old_jsonb ? 'endpoint' THEN _old_jsonb->>'endpoint'
                WHEN _old_jsonb ? 'entity_type' THEN _old_jsonb->>'entity_type'
                ELSE 'N/A'
            END
        ELSE 'N/A'
        END
    );
    
    INSERT INTO activity_logs (
        user_id,
        action,
        entity_type,
        entity_id,
        entity_name,
        old_values,
        new_values,
        ip_address,
        tenant_id
    ) VALUES (
        COALESCE(_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
        _action,
        TG_TABLE_NAME,
        COALESCE(
            CASE WHEN TG_OP = 'DELETE' THEN (_old_jsonb->>'id')::UUID 
            ELSE (_new_jsonb->>'id')::UUID END,
            '00000000-0000-0000-0000-000000000000'::UUID
        )::TEXT,
        _entity_name,
        _old_values,
        _new_values,
        current_setting('request.headers', true)::json->>'x-forwarded-for',
        CASE WHEN TG_OP = 'DELETE' THEN (_old_jsonb->>'tenant_id')::UUID 
        ELSE (_new_jsonb->>'tenant_id')::UUID END
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;