-- =============================================
-- PHASE 1.1: MULTI-TENANT INFRASTRUCTURE
-- =============================================

-- 1. Create tenants table
CREATE TABLE public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    domain TEXT UNIQUE,
    settings JSONB DEFAULT '{}',
    subscription_tier TEXT NOT NULL DEFAULT 'free',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Create user_tenants junction table
CREATE TABLE public.user_tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    is_default BOOLEAN NOT NULL DEFAULT false,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, tenant_id)
);

-- 3. Create indexes for performance
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_domain ON public.tenants(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_tenants_active ON public.tenants(is_active) WHERE is_active = true;
CREATE INDEX idx_user_tenants_user_id ON public.user_tenants(user_id);
CREATE INDEX idx_user_tenants_tenant_id ON public.user_tenants(tenant_id);
CREATE INDEX idx_user_tenants_default ON public.user_tenants(user_id, is_default) WHERE is_default = true;

-- 4. Enable RLS on tenant tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- 5. Create get_current_tenant() function
CREATE OR REPLACE FUNCTION public.get_current_tenant()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT ut.tenant_id
    FROM public.user_tenants ut
    WHERE ut.user_id = auth.uid()
    AND ut.is_default = true
    LIMIT 1
$$;

-- 6. Create function to check tenant membership
CREATE OR REPLACE FUNCTION public.is_tenant_member(_user_id UUID, _tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_tenants
        WHERE user_id = _user_id AND tenant_id = _tenant_id
    )
$$;

-- 7. Create function to get user's tenants
CREATE OR REPLACE FUNCTION public.get_user_tenants(_user_id UUID)
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT tenant_id FROM public.user_tenants WHERE user_id = _user_id
$$;

-- 8. RLS Policies for tenants table
CREATE POLICY "Users can view their tenants"
    ON public.tenants FOR SELECT TO authenticated
    USING (
        id IN (SELECT public.get_user_tenants(auth.uid()))
    );

CREATE POLICY "Admins can create tenants"
    ON public.tenants FOR INSERT TO authenticated
    WITH CHECK (
        public.has_role(auth.uid(), 'admin')
    );

CREATE POLICY "Tenant admins can update their tenant"
    ON public.tenants FOR UPDATE TO authenticated
    USING (
        id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

-- 9. RLS Policies for user_tenants table
CREATE POLICY "Users can view their tenant memberships"
    ON public.user_tenants FOR SELECT TO authenticated
    USING (
        user_id = auth.uid()
        OR tenant_id = public.get_current_tenant()
    );

CREATE POLICY "Admins can manage tenant memberships"
    ON public.user_tenants FOR ALL TO authenticated
    USING (
        tenant_id = public.get_current_tenant()
        AND public.has_role(auth.uid(), 'admin')
    );

-- 10. Update timestamps trigger for tenants
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON public.tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Audit logging triggers
CREATE TRIGGER audit_tenants_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.tenants
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();

CREATE TRIGGER audit_user_tenants_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.user_tenants
    FOR EACH ROW EXECUTE FUNCTION public.log_activity();