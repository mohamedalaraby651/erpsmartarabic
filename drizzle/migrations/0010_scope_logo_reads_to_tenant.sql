DROP POLICY IF EXISTS "Tenant users can view their logos" ON storage.objects;
CREATE POLICY "Tenant users can view their logos" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'logos' AND public.storage_tenant_from_path(name) = public.get_current_tenant());