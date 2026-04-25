-- ===== 1. Fix check_section_permission column name =====
CREATE OR REPLACE FUNCTION public.check_section_permission(_user_id uuid, _section text, _action text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _custom_role_id uuid;
  _has_perm boolean;
  _current_tenant uuid;
BEGIN
  _current_tenant := public.get_current_tenant();

  IF public.has_role(_user_id, 'admin'::app_role) THEN
    RETURN true;
  END IF;

  SELECT custom_role_id INTO _custom_role_id
  FROM public.user_roles
  WHERE user_id = _user_id
    AND tenant_id = _current_tenant
  LIMIT 1;

  IF _custom_role_id IS NULL THEN
    RETURN false;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.role_section_permissions rsp
    JOIN public.custom_roles cr ON cr.id = rsp.role_id
    WHERE rsp.role_id = _custom_role_id
      AND cr.tenant_id = _current_tenant
      AND rsp.section = _section
      AND (
        (_action = 'view'   AND rsp.can_view   = true) OR
        (_action = 'create' AND rsp.can_create = true) OR
        (_action = 'edit'   AND rsp.can_edit   = true) OR
        (_action = 'delete' AND rsp.can_delete = true)
      )
  ) INTO _has_perm;

  RETURN COALESCE(_has_perm, false);
END;
$$;

-- ===== 2. Tenant-scope user_login_history admin policy =====
DROP POLICY IF EXISTS "Admins can view all login history" ON public.user_login_history;

CREATE POLICY "Admins can view tenant login history"
ON public.user_login_history FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND user_id IN (
    SELECT user_id FROM public.user_tenants
    WHERE tenant_id = public.get_current_tenant()
  )
);

-- ===== 3. Remove lax attachments INSERT policy =====
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON public.attachments;

-- ===== 4. Replace lax logos write policies with admin-only =====
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;

CREATE POLICY "Admins can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'logos'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'logos'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'logos'
  AND public.has_role(auth.uid(), 'admin'::app_role)
);