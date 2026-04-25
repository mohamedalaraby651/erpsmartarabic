-- ===== Make logos bucket private =====
UPDATE storage.buckets SET public = false WHERE id = 'logos';

-- Drop any old public read policy on logos
DROP POLICY IF EXISTS "Public read access for logos" ON storage.objects;
DROP POLICY IF EXISTS "Logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view logos" ON storage.objects;

-- Authenticated read for logos
CREATE POLICY "Authenticated users can view logos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'logos');

-- Authenticated upload (any logged-in user; tenant scoping enforced via path conventions)
DROP POLICY IF EXISTS "Authenticated users can upload logos" ON storage.objects;
CREATE POLICY "Authenticated users can upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated users can update logos" ON storage.objects;
CREATE POLICY "Authenticated users can update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos');

DROP POLICY IF EXISTS "Authenticated users can delete logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos');