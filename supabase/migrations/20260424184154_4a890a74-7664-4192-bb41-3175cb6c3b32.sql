-- ============================================
-- PART 1: Tenant integrity hardening
-- ============================================

-- Auto-set tenant_id trigger function
CREATE OR REPLACE FUNCTION public.set_tenant_id_default()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.tenant_id IS NULL THEN
    NEW.tenant_id := public.get_current_tenant();
  END IF;
  RETURN NEW;
END;
$$;

-- Apply DEFAULT + NOT NULL + trigger to critical tables
DO $$
DECLARE
  _tables text[] := ARRAY[
    'customers','invoices','invoice_items','payments','products','product_stock',
    'suppliers','supplier_payments','purchase_orders','purchase_order_items',
    'sales_orders','sales_order_items','quotations','quotation_items',
    'journals','journal_entries','expenses','attachments','employees',
    'customer_communications','customer_reminders','customer_notes',
    'customer_addresses','credit_notes','credit_note_items',
    'stock_movements','cash_transactions','company_settings','warehouses'
  ];
  _t text;
BEGIN
  FOREACH _t IN ARRAY _tables LOOP
    -- DEFAULT
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT public.get_current_tenant()',
      _t
    );
    -- NOT NULL (only when no nulls remain)
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL',
      _t
    );
    -- Auto-fill trigger
    EXECUTE format('DROP TRIGGER IF EXISTS trg_set_tenant_id ON public.%I', _t);
    EXECUTE format(
      'CREATE TRIGGER trg_set_tenant_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_tenant_id_default()',
      _t
    );
  END LOOP;
END $$;

-- ============================================
-- PART 2: Storage isolation (Hybrid model)
-- ============================================

-- Make sensitive buckets private; keep logos public
UPDATE storage.buckets SET public = false
  WHERE id IN ('avatars','customer-images','employee-images','supplier-images','documents');

UPDATE storage.buckets SET public = true WHERE id = 'logos';

-- Drop ALL existing object policies (we will recreate cleanly)
DO $$
DECLARE _p record;
BEGIN
  FOR _p IN SELECT policyname FROM pg_policies WHERE schemaname='storage' AND tablename='objects'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', _p.policyname);
  END LOOP;
END $$;

-- Helper: extract tenant_id from object path (1st segment)
CREATE OR REPLACE FUNCTION public.storage_tenant_from_path(_name text)
RETURNS uuid
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF((storage.foldername(_name))[1], '')::uuid
$$;

-- ===== LOGOS (public read, admin write) =====
CREATE POLICY "Public can read logos"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'logos');

CREATE POLICY "Admins upload logos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update logos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete logos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'logos' AND public.has_role(auth.uid(), 'admin'));

-- ===== DOCUMENTS (private + tenant-scoped) =====
CREATE POLICY "Tenant members read documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
);

CREATE POLICY "Tenant members upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
);

CREATE POLICY "Tenant members update documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
);

CREATE POLICY "Tenant members delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'))
);

-- ===== CUSTOMER IMAGES (private + tenant-scoped, sales/admin) =====
CREATE POLICY "Tenant members read customer images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'customer-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
);

CREATE POLICY "Sales/admin upload customer images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'customer-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'))
);

CREATE POLICY "Sales/admin update customer images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'customer-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'))
);

CREATE POLICY "Sales/admin delete customer images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'customer-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'))
);

-- ===== EMPLOYEE IMAGES (private + tenant-scoped, hr/admin) =====
CREATE POLICY "Tenant members read employee images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'employee-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
);

CREATE POLICY "HR/admin upload employee images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'employee-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
);

CREATE POLICY "HR/admin update employee images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'employee-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
);

CREATE POLICY "HR/admin delete employee images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'employee-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'hr'))
);

-- ===== SUPPLIER IMAGES (private + tenant-scoped, warehouse/admin) =====
CREATE POLICY "Tenant members read supplier images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'supplier-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
);

CREATE POLICY "Warehouse/admin upload supplier images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'supplier-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'))
);

CREATE POLICY "Warehouse/admin update supplier images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'supplier-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'))
);

CREATE POLICY "Warehouse/admin delete supplier images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'supplier-images'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'))
);

-- ===== AVATARS (private + user-scoped within tenant) =====
-- Path convention: <tenant_id>/<user_id>/<filename>
CREATE POLICY "Tenant members read avatars"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
);

CREATE POLICY "Users upload own avatar"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users update own avatar"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND (storage.foldername(name))[2] = auth.uid()::text
);

CREATE POLICY "Users delete own avatar"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND public.storage_tenant_from_path(name) = public.get_current_tenant()
  AND ((storage.foldername(name))[2] = auth.uid()::text OR public.has_role(auth.uid(), 'admin'))
);