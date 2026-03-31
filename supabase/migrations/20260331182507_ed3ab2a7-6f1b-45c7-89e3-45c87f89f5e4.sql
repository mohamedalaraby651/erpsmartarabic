
-- Create default tenant
INSERT INTO public.tenants (id, name, slug, subscription_tier, is_active)
VALUES ('a0000000-0000-0000-0000-000000000001', 'الشركة الافتراضية', 'default', 'professional', true)
ON CONFLICT DO NOTHING;

-- Assign ALL existing users to this tenant
INSERT INTO public.user_tenants (user_id, tenant_id, is_default)
SELECT p.id, 'a0000000-0000-0000-0000-000000000001'::uuid, true
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_tenants ut WHERE ut.user_id = p.id
)
ON CONFLICT DO NOTHING;

-- Also create a trigger to auto-assign new users to this default tenant
CREATE OR REPLACE FUNCTION public.auto_assign_default_tenant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_tenants (user_id, tenant_id, is_default)
  VALUES (NEW.id, 'a0000000-0000-0000-0000-000000000001'::uuid, true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_profile_created_assign_tenant ON public.profiles;
CREATE TRIGGER on_profile_created_assign_tenant
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_assign_default_tenant();
