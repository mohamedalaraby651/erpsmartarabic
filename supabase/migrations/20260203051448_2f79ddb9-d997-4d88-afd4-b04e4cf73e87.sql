-- =====================================================
-- Q1 PHASE 1: SECURITY FUNCTIONS ENHANCEMENT
-- Enterprise Transformation - Foundation & Governance
-- =====================================================

-- 1. وظيفة فحص permission من role_section_permissions
CREATE OR REPLACE FUNCTION public.check_section_permission(
    _user_id UUID,
    _section TEXT,
    _action TEXT -- 'view' | 'create' | 'edit' | 'delete'
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _custom_role_id UUID;
    _has_permission BOOLEAN := false;
BEGIN
    -- Admin has all permissions
    IF has_role(_user_id, 'admin') THEN
        RETURN true;
    END IF;
    
    -- Get user's custom role
    SELECT custom_role_id INTO _custom_role_id
    FROM user_roles
    WHERE user_id = _user_id
    LIMIT 1;
    
    IF _custom_role_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Check section permission
    SELECT 
        CASE _action
            WHEN 'view' THEN can_view
            WHEN 'create' THEN can_create
            WHEN 'edit' THEN can_edit
            WHEN 'delete' THEN can_delete
            ELSE false
        END INTO _has_permission
    FROM role_section_permissions
    WHERE role_id = _custom_role_id 
    AND section = _section;
    
    RETURN COALESCE(_has_permission, false);
END;
$$;

-- 2. وظيفة فحص الحد المالي
CREATE OR REPLACE FUNCTION public.check_financial_limit(
    _user_id UUID,
    _limit_type TEXT, -- 'discount' | 'credit' | 'invoice'
    _value DECIMAL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _custom_role_id UUID;
    _max_value DECIMAL;
BEGIN
    -- Admin has no limits
    IF has_role(_user_id, 'admin') THEN
        RETURN true;
    END IF;
    
    -- Get custom role
    SELECT custom_role_id INTO _custom_role_id
    FROM user_roles
    WHERE user_id = _user_id
    LIMIT 1;
    
    IF _custom_role_id IS NULL THEN
        RETURN false;
    END IF;
    
    -- Get limit
    SELECT 
        CASE _limit_type
            WHEN 'discount' THEN max_discount_percentage
            WHEN 'credit' THEN max_credit_limit
            WHEN 'invoice' THEN max_invoice_amount
            ELSE 999999999
        END INTO _max_value
    FROM role_limits
    WHERE role_id = _custom_role_id;
    
    RETURN _value <= COALESCE(_max_value, 999999999);
END;
$$;

-- 3. وظيفة Audit Log التلقائية
CREATE OR REPLACE FUNCTION public.log_activity()
RETURNS TRIGGER
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
BEGIN
    _user_id := auth.uid();
    
    IF TG_OP = 'INSERT' THEN
        _action := 'create';
        _new_values := to_jsonb(NEW);
        _old_values := NULL;
    ELSIF TG_OP = 'UPDATE' THEN
        _action := 'update';
        _old_values := to_jsonb(OLD);
        _new_values := to_jsonb(NEW);
    ELSIF TG_OP = 'DELETE' THEN
        _action := 'delete';
        _old_values := to_jsonb(OLD);
        _new_values := NULL;
    END IF;
    
    -- Try to get entity name from various common columns
    _entity_name := COALESCE(
        CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE 
            CASE 
                WHEN to_jsonb(NEW) ? 'name' THEN NEW.name
                WHEN to_jsonb(NEW) ? 'full_name' THEN NEW.full_name
                WHEN to_jsonb(NEW) ? 'invoice_number' THEN NEW.invoice_number
                WHEN to_jsonb(NEW) ? 'order_number' THEN NEW.order_number
                WHEN to_jsonb(NEW) ? 'quotation_number' THEN NEW.quotation_number
                WHEN to_jsonb(NEW) ? 'payment_number' THEN NEW.payment_number
                WHEN to_jsonb(NEW) ? 'expense_number' THEN NEW.expense_number
                WHEN to_jsonb(NEW) ? 'transaction_number' THEN NEW.transaction_number
                WHEN to_jsonb(NEW) ? 'title' THEN NEW.title
                ELSE NULL
            END
        END,
        CASE 
            WHEN to_jsonb(OLD) ? 'name' THEN OLD.name
            WHEN to_jsonb(OLD) ? 'full_name' THEN OLD.full_name
            WHEN to_jsonb(OLD) ? 'invoice_number' THEN OLD.invoice_number
            WHEN to_jsonb(OLD) ? 'order_number' THEN OLD.order_number
            WHEN to_jsonb(OLD) ? 'quotation_number' THEN OLD.quotation_number
            WHEN to_jsonb(OLD) ? 'payment_number' THEN OLD.payment_number
            WHEN to_jsonb(OLD) ? 'expense_number' THEN OLD.expense_number
            WHEN to_jsonb(OLD) ? 'transaction_number' THEN OLD.transaction_number
            WHEN to_jsonb(OLD) ? 'title' THEN OLD.title
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
        ip_address
    ) VALUES (
        COALESCE(_user_id, '00000000-0000-0000-0000-000000000000'::UUID),
        _action,
        TG_TABLE_NAME,
        COALESCE(
            CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
            '00000000-0000-0000-0000-000000000000'::UUID
        )::TEXT,
        _entity_name,
        _old_values,
        _new_values,
        current_setting('request.headers', true)::json->>'x-forwarded-for'
    );
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4. إضافة Triggers للجداول الحساسة

-- Drop existing triggers if they exist (to avoid errors)
DROP TRIGGER IF EXISTS audit_invoices ON invoices;
DROP TRIGGER IF EXISTS audit_payments ON payments;
DROP TRIGGER IF EXISTS audit_customers ON customers;
DROP TRIGGER IF EXISTS audit_products ON products;
DROP TRIGGER IF EXISTS audit_purchase_orders ON purchase_orders;
DROP TRIGGER IF EXISTS audit_expenses ON expenses;
DROP TRIGGER IF EXISTS audit_cash_transactions ON cash_transactions;
DROP TRIGGER IF EXISTS audit_stock_movements ON stock_movements;
DROP TRIGGER IF EXISTS audit_user_roles ON user_roles;
DROP TRIGGER IF EXISTS audit_quotations ON quotations;
DROP TRIGGER IF EXISTS audit_sales_orders ON sales_orders;
DROP TRIGGER IF EXISTS audit_suppliers ON suppliers;
DROP TRIGGER IF EXISTS audit_employees ON employees;

-- Create audit triggers
CREATE TRIGGER audit_invoices
    AFTER INSERT OR UPDATE OR DELETE ON invoices
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_payments
    AFTER INSERT OR UPDATE OR DELETE ON payments
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_customers
    AFTER INSERT OR UPDATE OR DELETE ON customers
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_products
    AFTER INSERT OR UPDATE OR DELETE ON products
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_purchase_orders
    AFTER INSERT OR UPDATE OR DELETE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_expenses
    AFTER INSERT OR UPDATE OR DELETE ON expenses
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_cash_transactions
    AFTER INSERT OR UPDATE OR DELETE ON cash_transactions
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_stock_movements
    AFTER INSERT OR UPDATE OR DELETE ON stock_movements
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_user_roles
    AFTER INSERT OR UPDATE OR DELETE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_quotations
    AFTER INSERT OR UPDATE OR DELETE ON quotations
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_sales_orders
    AFTER INSERT OR UPDATE OR DELETE ON sales_orders
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_suppliers
    AFTER INSERT OR UPDATE OR DELETE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER audit_employees
    AFTER INSERT OR UPDATE OR DELETE ON employees
    FOR EACH ROW EXECUTE FUNCTION log_activity();

-- 5. Views للمراقبة الأمنية

-- View للوحة مراقبة الأمان
CREATE OR REPLACE VIEW public.security_dashboard AS
SELECT 
    DATE_TRUNC('hour', created_at) as time_bucket,
    action,
    entity_type,
    COUNT(*) as action_count,
    COUNT(DISTINCT user_id) as unique_users
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY 1, 2, 3
ORDER BY 1 DESC;

-- View للعمليات المشبوهة
CREATE OR REPLACE VIEW public.suspicious_activities AS
SELECT 
    user_id,
    entity_type,
    action,
    COUNT(*) as frequency,
    MIN(created_at) as first_action,
    MAX(created_at) as last_action
FROM activity_logs
WHERE created_at > NOW() - INTERVAL '1 hour'
GROUP BY 1, 2, 3
HAVING COUNT(*) > 50
ORDER BY frequency DESC;