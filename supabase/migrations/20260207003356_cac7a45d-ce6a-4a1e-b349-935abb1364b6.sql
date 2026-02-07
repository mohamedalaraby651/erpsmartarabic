
-- ===================================
-- Platform Admins Table
-- ===================================
CREATE TABLE public.platform_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'support', 'billing')),
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id)
);

-- Enable RLS
ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Only platform admins can view this table
CREATE POLICY "Platform admins can view all"
  ON public.platform_admins
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid() AND pa.is_active = true
    )
  );

-- Only super_admin can manage platform admins
CREATE POLICY "Super admins can manage"
  ON public.platform_admins
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid() AND pa.is_active = true AND pa.role = 'super_admin'
    )
  );

-- ===================================
-- Platform Audit Logs Table
-- ===================================
CREATE TABLE public.platform_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid REFERENCES auth.users(id),
  action text NOT NULL,
  target_type text,
  target_id text,
  details jsonb,
  ip_address text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins can view audit logs"
  ON public.platform_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid() AND pa.is_active = true
    )
  );

CREATE POLICY "Platform admins can insert audit logs"
  ON public.platform_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.platform_admins pa
      WHERE pa.user_id = auth.uid() AND pa.is_active = true
    )
  );

-- ===================================
-- Function: Check if user is platform admin
-- ===================================
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.platform_admins
    WHERE user_id = _user_id
      AND is_active = true
  )
$$;

-- ===================================
-- Function: Get platform admin role
-- ===================================
CREATE OR REPLACE FUNCTION public.get_platform_role(_user_id uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.platform_admins
  WHERE user_id = _user_id
    AND is_active = true
$$;

-- ===================================
-- Function: Get platform stats
-- ===================================
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: not a platform admin';
  END IF;

  SELECT jsonb_build_object(
    'total_tenants', (SELECT COUNT(*) FROM public.tenants),
    'active_tenants', (SELECT COUNT(*) FROM public.tenants WHERE is_active = true),
    'suspended_tenants', (SELECT COUNT(*) FROM public.tenants WHERE is_active = false),
    'total_users', (SELECT COUNT(*) FROM public.profiles),
    'basic_tier', (SELECT COUNT(*) FROM public.tenants WHERE subscription_tier = 'basic'),
    'professional_tier', (SELECT COUNT(*) FROM public.tenants WHERE subscription_tier = 'professional'),
    'enterprise_tier', (SELECT COUNT(*) FROM public.tenants WHERE subscription_tier = 'enterprise'),
    'monthly_invoices', (SELECT COUNT(*) FROM public.invoices WHERE created_at > now() - interval '30 days'),
    'monthly_revenue', (SELECT COALESCE(SUM(total_amount), 0) FROM public.invoices WHERE created_at > now() - interval '30 days')
  ) INTO result;

  RETURN result;
END;
$$;

-- ===================================
-- Function: Get all tenants for platform admin
-- ===================================
CREATE OR REPLACE FUNCTION public.get_all_tenants_admin()
RETURNS TABLE (
  id uuid,
  name text,
  slug text,
  domain text,
  subscription_tier text,
  is_active boolean,
  created_at timestamptz,
  updated_at timestamptz,
  user_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: not a platform admin';
  END IF;

  RETURN QUERY
  SELECT 
    t.id,
    t.name,
    t.slug,
    t.domain,
    t.subscription_tier,
    t.is_active,
    t.created_at,
    t.updated_at,
    (SELECT COUNT(*) FROM public.user_tenants ut WHERE ut.tenant_id = t.id) as user_count
  FROM public.tenants t
  ORDER BY t.created_at DESC;
END;
$$;

-- ===================================
-- Function: Toggle tenant status (platform admin only)
-- ===================================
CREATE OR REPLACE FUNCTION public.toggle_tenant_status(_tenant_id uuid, _is_active boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: not a platform admin';
  END IF;

  UPDATE public.tenants SET is_active = _is_active, updated_at = now()
  WHERE id = _tenant_id;

  -- Log the action
  INSERT INTO public.platform_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), CASE WHEN _is_active THEN 'activate_tenant' ELSE 'suspend_tenant' END, 'tenant', _tenant_id::text, jsonb_build_object('is_active', _is_active));

  RETURN true;
END;
$$;

-- ===================================
-- Function: Update tenant subscription (platform admin only)
-- ===================================
CREATE OR REPLACE FUNCTION public.update_tenant_subscription(_tenant_id uuid, _tier text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Access denied: not a platform admin';
  END IF;

  UPDATE public.tenants SET subscription_tier = _tier, updated_at = now()
  WHERE id = _tenant_id;

  -- Log the action
  INSERT INTO public.platform_audit_logs (admin_id, action, target_type, target_id, details)
  VALUES (auth.uid(), 'update_subscription', 'tenant', _tenant_id::text, jsonb_build_object('new_tier', _tier));

  RETURN true;
END;
$$;

-- Updated at trigger
CREATE TRIGGER update_platform_admins_updated_at
  BEFORE UPDATE ON public.platform_admins
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
