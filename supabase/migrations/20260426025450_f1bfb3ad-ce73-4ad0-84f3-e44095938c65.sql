-- 1) Restrict tenant creation to platform admins only
DROP POLICY IF EXISTS "Admins can manage tenants" ON public.tenants;
DROP POLICY IF EXISTS "Admins can insert tenants" ON public.tenants;
DROP POLICY IF EXISTS "tenants_insert_policy" ON public.tenants;

CREATE POLICY "Platform admins can insert tenants" ON public.tenants
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

CREATE POLICY "Platform admins can update tenants" ON public.tenants
FOR UPDATE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
)
WITH CHECK (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

CREATE POLICY "Platform admins can delete tenants" ON public.tenants
FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.platform_admins WHERE user_id = auth.uid())
);

-- 2) Remove duplicate INSERT policies that bypass financial limits
DROP POLICY IF EXISTS "Tenant users can create invoices" ON public.invoices;
DROP POLICY IF EXISTS "Tenant users can create customers" ON public.customers;