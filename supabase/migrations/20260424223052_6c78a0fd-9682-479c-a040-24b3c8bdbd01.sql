
-- ============================================================
-- P0-S1: Fix user_roles privilege escalation
-- ============================================================

DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;

-- SELECT: users see their own; admins see only their tenant
CREATE POLICY "user_roles_select_own"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "user_roles_select_admin_tenant"
ON public.user_roles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id = public.get_current_tenant()
);

-- INSERT: only admin of the same tenant can create, and target tenant must be current
CREATE POLICY "user_roles_insert_admin_tenant"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id = public.get_current_tenant()
  AND public.is_tenant_member(user_id, tenant_id)
);

-- UPDATE: admin within tenant only, cannot move row to another tenant
CREATE POLICY "user_roles_update_admin_tenant"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id = public.get_current_tenant()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id = public.get_current_tenant()
);

-- DELETE: admin within tenant only
CREATE POLICY "user_roles_delete_admin_tenant"
ON public.user_roles
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND tenant_id = public.get_current_tenant()
);

-- ============================================================
-- P0-S2: supplier_notes cross-tenant isolation
-- ============================================================

-- Step 1: add nullable column
ALTER TABLE public.supplier_notes
  ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- Step 2: backfill from suppliers
UPDATE public.supplier_notes sn
SET tenant_id = s.tenant_id
FROM public.suppliers s
WHERE sn.supplier_id = s.id
  AND sn.tenant_id IS NULL;

-- Step 3: enforce NOT NULL + FK + index
ALTER TABLE public.supplier_notes
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.supplier_notes
  ADD CONSTRAINT supplier_notes_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public.tenants(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_supplier_notes_tenant_id
  ON public.supplier_notes(tenant_id);

-- Step 4: trigger to auto-set tenant_id on insert
CREATE OR REPLACE FUNCTION public.set_supplier_notes_tenant()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    SELECT s.tenant_id INTO NEW.tenant_id
    FROM public.suppliers s
    WHERE s.id = NEW.supplier_id;
  END IF;
  IF NEW.tenant_id IS NULL THEN
    RAISE EXCEPTION 'tenant_id required for supplier_notes';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_supplier_notes_tenant ON public.supplier_notes;
CREATE TRIGGER trg_set_supplier_notes_tenant
BEFORE INSERT ON public.supplier_notes
FOR EACH ROW EXECUTE FUNCTION public.set_supplier_notes_tenant();

-- Step 5: rewrite RLS policies with tenant scoping
DROP POLICY IF EXISTS supplier_notes_select_policy ON public.supplier_notes;
DROP POLICY IF EXISTS supplier_notes_insert_policy ON public.supplier_notes;
DROP POLICY IF EXISTS supplier_notes_update_policy ON public.supplier_notes;
DROP POLICY IF EXISTS supplier_notes_delete_policy ON public.supplier_notes;

CREATE POLICY supplier_notes_select_policy
ON public.supplier_notes
FOR SELECT
TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.check_section_permission(auth.uid(), 'suppliers', 'view')
  )
);

CREATE POLICY supplier_notes_insert_policy
ON public.supplier_notes
FOR INSERT
TO authenticated
WITH CHECK (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.check_section_permission(auth.uid(), 'suppliers', 'create')
  )
);

CREATE POLICY supplier_notes_update_policy
ON public.supplier_notes
FOR UPDATE
TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.check_section_permission(auth.uid(), 'suppliers', 'edit')
  )
)
WITH CHECK (
  tenant_id = public.get_current_tenant()
);

CREATE POLICY supplier_notes_delete_policy
ON public.supplier_notes
FOR DELETE
TO authenticated
USING (
  tenant_id = public.get_current_tenant()
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.check_section_permission(auth.uid(), 'suppliers', 'delete')
  )
);

-- ============================================================
-- P0-S3: documents storage bucket hardening
-- ============================================================

DROP POLICY IF EXISTS "documents_authenticated_select" ON storage.objects;
DROP POLICY IF EXISTS "documents_authenticated_insert" ON storage.objects;
DROP POLICY IF EXISTS "documents_authenticated_update" ON storage.objects;
DROP POLICY IF EXISTS "documents_authenticated_delete" ON storage.objects;

CREATE POLICY "documents_authenticated_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = public.get_current_tenant()::text
);

CREATE POLICY "documents_authenticated_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = public.get_current_tenant()::text
);

CREATE POLICY "documents_authenticated_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = public.get_current_tenant()::text
);

CREATE POLICY "documents_authenticated_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents'
  AND (storage.foldername(name))[1] = public.get_current_tenant()::text
);
