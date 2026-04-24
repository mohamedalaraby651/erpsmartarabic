-- ============================================
-- STEP 0.3: Add tenant_id to remaining tables + harden RLS
-- ============================================

-- ===== report_templates =====
ALTER TABLE public.report_templates
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_report_templates_tenant
  ON public.report_templates(tenant_id);

-- Drop permissive policy
DROP POLICY IF EXISTS "Authenticated can view report templates" ON public.report_templates;

-- Tenant-scoped policies
CREATE POLICY "Tenant members view report templates"
ON public.report_templates FOR SELECT TO authenticated
USING (tenant_id = public.get_current_tenant());

CREATE POLICY "Tenant members create report templates"
ON public.report_templates FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND created_by = auth.uid()
);

CREATE POLICY "Owner or admin update report templates"
ON public.report_templates FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
)
WITH CHECK (tenant_id = public.get_current_tenant());

CREATE POLICY "Owner or admin delete report templates"
ON public.report_templates FOR DELETE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);

-- ===== role_field_permissions =====
ALTER TABLE public.role_field_permissions
  ADD COLUMN IF NOT EXISTS tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_role_field_permissions_tenant
  ON public.role_field_permissions(tenant_id);

-- Drop permissive policy
DROP POLICY IF EXISTS "Authenticated can view field permissions" ON public.role_field_permissions;

-- Admin-only within tenant scope
CREATE POLICY "Admins view field permissions"
ON public.role_field_permissions FOR SELECT TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins manage field permissions insert"
ON public.role_field_permissions FOR INSERT TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins manage field permissions update"
ON public.role_field_permissions FOR UPDATE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (tenant_id = public.get_current_tenant());

CREATE POLICY "Admins manage field permissions delete"
ON public.role_field_permissions FOR DELETE TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND public.has_role(auth.uid(), 'admin')
);