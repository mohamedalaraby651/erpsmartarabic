-- Make storage buckets private to prevent unauthorized access
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('avatars', 'employee-images', 'customer-images', 'supplier-images', 'logos');

-- Add SELECT policies for authenticated users to view their uploaded files
-- Avatars: users can view all avatars (for displaying in UI)
CREATE POLICY "Authenticated users can view avatars" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'avatars');

-- Employee images: users with any role can view
CREATE POLICY "Authenticated users can view employee images" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'employee-images');

-- Customer images: users with any role can view  
CREATE POLICY "Authenticated users can view customer images" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'customer-images');

-- Supplier images: users with any role can view
CREATE POLICY "Authenticated users can view supplier images" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'supplier-images');

-- Logos: users with any role can view company logos
CREATE POLICY "Authenticated users can view logos" 
ON storage.objects FOR SELECT 
TO authenticated
USING (bucket_id = 'logos');