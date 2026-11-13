-- OPA-STORAGE-001: restrict restore-snapshots and logos to admin management.
-- Authorized by the user on 2026-11-13 as an explicit Smart Freeze exception for storage policies.

-- restore-snapshots: client writes and deletes were already impossible. The two
-- "no direct write/delete" rules were PERMISSIVE with a constant-false clause, so
-- they granted nothing; RLS default-deny is the real guard. Dropping them keeps the
-- exact same posture and removes the misleading rules.
DROP POLICY IF EXISTS "Snapshot files no direct write" ON storage.objects;
DROP POLICY IF EXISTS "Snapshot files no direct delete" ON storage.objects;

-- Read path: was admin OR tenant owner. The restore flow downloads through the
-- service role inside the edge functions, so no client read is required.
DROP POLICY IF EXISTS "Snapshot files readable by admin or tenant owner" ON storage.objects;
CREATE POLICY "Snapshot files readable by admin only"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'restore-snapshots'
  AND public.has_role(auth.uid(), 'admin')
);

-- logos: upload/replace/delete stay admin-only (existing policies untouched).
-- Read: close the cross-tenant hole that let any signed-in user read root-level
-- objects; bind those to their uploader, keep tenant-foldered logos readable by
-- tenant members, and let admins always read.
DROP POLICY IF EXISTS "Tenant users can view their logos" ON storage.objects;
CREATE POLICY "Tenant users can view their logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'logos'
  AND (
    public.has_role(auth.uid(), 'admin')
    OR public.storage_tenant_from_path(name) = public.get_current_tenant()
    OR owner = auth.uid()
  )
);