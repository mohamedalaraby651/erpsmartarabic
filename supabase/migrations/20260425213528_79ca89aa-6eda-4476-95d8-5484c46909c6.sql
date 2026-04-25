-- Remove duplicate logo policies (keep "Admins can ..." versions)
DROP POLICY IF EXISTS "Admins delete logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins update logos" ON storage.objects;
DROP POLICY IF EXISTS "Admins upload logos" ON storage.objects;