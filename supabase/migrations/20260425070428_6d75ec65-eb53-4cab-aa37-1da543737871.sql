-- 1. permission_matrix_cache: drop authenticated INSERT
DROP POLICY IF EXISTS "System inserts cache" ON public.permission_matrix_cache;

-- 2. attachments: drop broad tenant-only policies, keep role-based ones
DROP POLICY IF EXISTS "Tenant users can view attachments" ON public.attachments;
DROP POLICY IF EXISTS "Tenant users can create attachments" ON public.attachments;
DROP POLICY IF EXISTS "Tenant users can update attachments" ON public.attachments;
DROP POLICY IF EXISTS "Tenant users can delete attachments" ON public.attachments;