
UPDATE storage.buckets SET public = true WHERE id = 'customer-images';
UPDATE storage.buckets SET public = true WHERE id = 'supplier-images';
UPDATE storage.buckets SET public = true WHERE id = 'employee-images';
UPDATE storage.buckets SET public = true WHERE id = 'avatars';

CREATE POLICY "Public read access for customer-images" ON storage.objects FOR SELECT USING (bucket_id = 'customer-images');
CREATE POLICY "Public read access for supplier-images" ON storage.objects FOR SELECT USING (bucket_id = 'supplier-images');
CREATE POLICY "Public read access for employee-images" ON storage.objects FOR SELECT USING (bucket_id = 'employee-images');
CREATE POLICY "Public read access for avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
