
DO $$ BEGIN
  CREATE TYPE public.pdf_profile_scope AS ENUM ('global','invoice','quotation','purchase_order','delivery_note','statement');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.pdf_asset_kind AS ENUM ('logo','watermark','signature','header_image','footer_image');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.tenant_pdf_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  scope_type public.pdf_profile_scope NOT NULL DEFAULT 'global',
  scope_id UUID,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  layout JSONB NOT NULL DEFAULT '{}'::jsonb,
  typography JSONB NOT NULL DEFAULT '{}'::jsonb,
  branding JSONB NOT NULL DEFAULT '{}'::jsonb,
  watermark JSONB NOT NULL DEFAULT '{}'::jsonb,
  header JSONB NOT NULL DEFAULT '{}'::jsonb,
  footer JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_pdf_profile_version_positive CHECK (version >= 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_pdf_profile_scope_version
  ON public.tenant_pdf_profiles (tenant_id, scope_type, COALESCE(scope_id,'00000000-0000-0000-0000-000000000000'::uuid), version);
CREATE INDEX IF NOT EXISTS idx_tenant_pdf_profiles_tenant_active
  ON public.tenant_pdf_profiles (tenant_id, scope_type, is_active);

ALTER TABLE public.tenant_pdf_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pdf_profiles_select_tenant" ON public.tenant_pdf_profiles;
CREATE POLICY "pdf_profiles_select_tenant" ON public.tenant_pdf_profiles
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "pdf_profiles_insert_admin" ON public.tenant_pdf_profiles;
CREATE POLICY "pdf_profiles_insert_admin" ON public.tenant_pdf_profiles
  FOR INSERT WITH CHECK (
    public.is_tenant_member(auth.uid(), tenant_id) AND public.has_role(auth.uid(),'admin')
  );

DROP POLICY IF EXISTS "pdf_profiles_update_admin" ON public.tenant_pdf_profiles;
CREATE POLICY "pdf_profiles_update_admin" ON public.tenant_pdf_profiles
  FOR UPDATE USING (
    public.is_tenant_member(auth.uid(), tenant_id) AND public.has_role(auth.uid(),'admin')
  );

DROP POLICY IF EXISTS "pdf_profiles_delete_admin" ON public.tenant_pdf_profiles;
CREATE POLICY "pdf_profiles_delete_admin" ON public.tenant_pdf_profiles
  FOR DELETE USING (
    public.is_tenant_member(auth.uid(), tenant_id) AND public.has_role(auth.uid(),'admin')
  );

DROP TRIGGER IF EXISTS trg_tenant_pdf_profiles_updated ON public.tenant_pdf_profiles;
CREATE TRIGGER trg_tenant_pdf_profiles_updated
  BEFORE UPDATE ON public.tenant_pdf_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.tenant_pdf_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  kind public.pdf_asset_kind NOT NULL,
  file_path TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  checksum TEXT,
  width INTEGER,
  height INTEGER,
  ref_count INTEGER NOT NULL DEFAULT 0,
  deleted_at TIMESTAMPTZ,
  uploaded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_pdf_asset_size_max CHECK (file_size > 0 AND file_size <= 2097152),
  CONSTRAINT chk_pdf_asset_dims CHECK ((width IS NULL OR width <= 2000) AND (height IS NULL OR height <= 2000))
);

CREATE INDEX IF NOT EXISTS idx_tenant_pdf_assets_tenant_kind
  ON public.tenant_pdf_assets (tenant_id, kind) WHERE deleted_at IS NULL;

ALTER TABLE public.tenant_pdf_assets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pdf_assets_select_tenant" ON public.tenant_pdf_assets;
CREATE POLICY "pdf_assets_select_tenant" ON public.tenant_pdf_assets
  FOR SELECT USING (public.is_tenant_member(auth.uid(), tenant_id));

DROP POLICY IF EXISTS "pdf_assets_insert_admin" ON public.tenant_pdf_assets;
CREATE POLICY "pdf_assets_insert_admin" ON public.tenant_pdf_assets
  FOR INSERT WITH CHECK (
    public.is_tenant_member(auth.uid(), tenant_id) AND public.has_role(auth.uid(),'admin')
  );

DROP POLICY IF EXISTS "pdf_assets_update_admin" ON public.tenant_pdf_assets;
CREATE POLICY "pdf_assets_update_admin" ON public.tenant_pdf_assets
  FOR UPDATE USING (
    public.is_tenant_member(auth.uid(), tenant_id) AND public.has_role(auth.uid(),'admin')
  );

DROP POLICY IF EXISTS "pdf_assets_delete_admin" ON public.tenant_pdf_assets;
CREATE POLICY "pdf_assets_delete_admin" ON public.tenant_pdf_assets
  FOR DELETE USING (
    public.is_tenant_member(auth.uid(), tenant_id) AND public.has_role(auth.uid(),'admin')
  );

DROP TRIGGER IF EXISTS trg_tenant_pdf_assets_updated ON public.tenant_pdf_assets;
CREATE TRIGGER trg_tenant_pdf_assets_updated
  BEFORE UPDATE ON public.tenant_pdf_assets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.tenant_pdf_profile_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  profile_id UUID NOT NULL REFERENCES public.tenant_pdf_profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  diff JSONB NOT NULL DEFAULT '{}'::jsonb,
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pdf_profile_audit_profile ON public.tenant_pdf_profile_audit (profile_id, performed_at DESC);
CREATE INDEX IF NOT EXISTS idx_pdf_profile_audit_tenant ON public.tenant_pdf_profile_audit (tenant_id, performed_at DESC);

ALTER TABLE public.tenant_pdf_profile_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pdf_audit_select_tenant" ON public.tenant_pdf_profile_audit;
CREATE POLICY "pdf_audit_select_tenant" ON public.tenant_pdf_profile_audit
  FOR SELECT USING (
    public.is_tenant_member(auth.uid(), tenant_id) AND public.has_role(auth.uid(),'admin')
  );

DROP POLICY IF EXISTS "pdf_audit_insert_system" ON public.tenant_pdf_profile_audit;
CREATE POLICY "pdf_audit_insert_system" ON public.tenant_pdf_profile_audit
  FOR INSERT WITH CHECK (public.is_tenant_member(auth.uid(), tenant_id));

CREATE OR REPLACE FUNCTION public.fn_log_pdf_profile_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE diff_obj JSONB := '{}'::jsonb; action_t TEXT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    action_t := 'create';
    diff_obj := jsonb_build_object('after', jsonb_build_object('scope_type', NEW.scope_type, 'version', NEW.version, 'is_active', NEW.is_active));
  ELSIF TG_OP = 'UPDATE' THEN
    action_t := 'update';
    diff_obj := jsonb_build_object(
      'before', jsonb_build_object('layout', OLD.layout, 'typography', OLD.typography, 'branding', OLD.branding, 'watermark', OLD.watermark, 'header', OLD.header, 'footer', OLD.footer, 'is_active', OLD.is_active, 'version', OLD.version),
      'after',  jsonb_build_object('layout', NEW.layout, 'typography', NEW.typography, 'branding', NEW.branding, 'watermark', NEW.watermark, 'header', NEW.header, 'footer', NEW.footer, 'is_active', NEW.is_active, 'version', NEW.version)
    );
  ELSIF TG_OP = 'DELETE' THEN
    action_t := 'delete';
    diff_obj := jsonb_build_object('before', jsonb_build_object('scope_type', OLD.scope_type, 'version', OLD.version));
    INSERT INTO public.tenant_pdf_profile_audit (tenant_id, profile_id, action, diff, performed_by)
    VALUES (OLD.tenant_id, OLD.id, action_t, diff_obj, auth.uid());
    RETURN OLD;
  END IF;
  INSERT INTO public.tenant_pdf_profile_audit (tenant_id, profile_id, action, diff, performed_by)
  VALUES (NEW.tenant_id, NEW.id, action_t, diff_obj, auth.uid());
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_log_pdf_profile_change ON public.tenant_pdf_profiles;
CREATE TRIGGER trg_log_pdf_profile_change
  AFTER INSERT OR UPDATE OR DELETE ON public.tenant_pdf_profiles
  FOR EACH ROW EXECUTE FUNCTION public.fn_log_pdf_profile_change();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('pdf-branding', 'pdf-branding', false, 2097152, ARRAY['image/png','image/jpeg','image/webp','image/svg+xml'])
ON CONFLICT (id) DO UPDATE
  SET file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types,
      public = false;

DROP POLICY IF EXISTS "pdf_branding_select_tenant" ON storage.objects;
CREATE POLICY "pdf_branding_select_tenant" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'pdf-branding' AND public.is_tenant_member(auth.uid(), (storage.foldername(name))[1]::uuid));

DROP POLICY IF EXISTS "pdf_branding_insert_admin" ON storage.objects;
CREATE POLICY "pdf_branding_insert_admin" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pdf-branding'
    AND public.is_tenant_member(auth.uid(), (storage.foldername(name))[1]::uuid)
    AND public.has_role(auth.uid(),'admin')
  );

DROP POLICY IF EXISTS "pdf_branding_update_admin" ON storage.objects;
CREATE POLICY "pdf_branding_update_admin" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'pdf-branding'
    AND public.is_tenant_member(auth.uid(), (storage.foldername(name))[1]::uuid)
    AND public.has_role(auth.uid(),'admin')
  );

DROP POLICY IF EXISTS "pdf_branding_delete_admin" ON storage.objects;
CREATE POLICY "pdf_branding_delete_admin" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pdf-branding'
    AND public.is_tenant_member(auth.uid(), (storage.foldername(name))[1]::uuid)
    AND public.has_role(auth.uid(),'admin')
  );
