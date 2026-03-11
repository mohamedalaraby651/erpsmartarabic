
-- ============================================
-- Security Hardening Migration - Phase 1
-- Fix critical RLS vulnerabilities
-- ============================================

-- 1. Enable RLS on security_dashboard (if it exists as a table)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'security_dashboard' AND relkind = 'r') THEN
    ALTER TABLE public.security_dashboard ENABLE ROW LEVEL SECURITY;
    
    -- Drop existing policies if any
    DROP POLICY IF EXISTS "security_dashboard_admin_only" ON public.security_dashboard;
    
    -- Only admins can view security dashboard
    CREATE POLICY "security_dashboard_admin_only"
      ON public.security_dashboard FOR SELECT
      TO authenticated
      USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 2. Enable RLS on suspicious_activities (if it exists as a table)
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'suspicious_activities' AND relkind = 'r') THEN
    ALTER TABLE public.suspicious_activities ENABLE ROW LEVEL SECURITY;
    
    DROP POLICY IF EXISTS "suspicious_activities_admin_only" ON public.suspicious_activities;
    
    CREATE POLICY "suspicious_activities_admin_only"
      ON public.suspicious_activities FOR SELECT
      TO authenticated
      USING (has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- 3. Add admin access to user_login_history SELECT
DROP POLICY IF EXISTS "Admins can view all login history" ON public.user_login_history;
CREATE POLICY "Admins can view all login history"
  ON public.user_login_history FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- 4. Create secure views for employees (masks sensitive columns for non-HR/admin)
CREATE OR REPLACE VIEW public.employees_safe AS
SELECT 
  id,
  employee_number,
  full_name,
  job_title,
  department,
  email,
  phone,
  phone2,
  hire_date,
  employment_status,
  contract_type,
  image_url,
  gender,
  marital_status,
  notes,
  tenant_id,
  user_id,
  created_at,
  updated_at,
  created_by,
  -- Mask sensitive fields for non-HR/admin users
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') 
    THEN national_id 
    ELSE '********' 
  END AS national_id,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') 
    THEN bank_account 
    ELSE '********' 
  END AS bank_account,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') 
    THEN base_salary 
    ELSE NULL 
  END AS base_salary,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') 
    THEN address 
    ELSE NULL 
  END AS address,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') 
    THEN birth_date 
    ELSE NULL 
  END AS birth_date,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') 
    THEN emergency_contact_name 
    ELSE NULL 
  END AS emergency_contact_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') 
    THEN emergency_contact_phone 
    ELSE NULL 
  END AS emergency_contact_phone
FROM public.employees;

-- 5. Create secure view for suppliers (masks banking info for non-admin/accountant)
CREATE OR REPLACE VIEW public.suppliers_safe AS
SELECT 
  id,
  name,
  contact_person,
  phone,
  phone2,
  email,
  address,
  tax_number,
  supplier_type,
  category,
  current_balance,
  is_active,
  rating,
  discount_percentage,
  payment_terms_days,
  credit_limit,
  last_transaction_date,
  notes,
  preferred_payment_method,
  image_url,
  website,
  governorate,
  city,
  tenant_id,
  created_at,
  updated_at,
  -- Mask banking info for non-admin/accountant
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') 
    THEN bank_name 
    ELSE '********' 
  END AS bank_name,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') 
    THEN bank_account 
    ELSE '********' 
  END AS bank_account,
  CASE 
    WHEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'accountant') 
    THEN iban 
    ELSE '********' 
  END AS iban
FROM public.suppliers;

-- 6. Tighten activity_logs INSERT - ensure only authenticated users can insert their own logs
-- The trigger function uses SECURITY DEFINER so it bypasses RLS
-- We keep the existing policies but make them more strict
DROP POLICY IF EXISTS "Service role can insert activity logs" ON public.activity_logs;
CREATE POLICY "Service role can insert activity logs"
  ON public.activity_logs FOR INSERT
  TO public
  WITH CHECK (
    -- Only service_role (for triggers) or the user themselves
    (current_setting('request.jwt.claims', true)::json->>'role' = 'service_role')
    OR (auth.uid() IS NOT NULL AND auth.uid() = user_id)
  );

-- 7. Add admin view for profiles (admins need to see all profiles for user management)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'));
