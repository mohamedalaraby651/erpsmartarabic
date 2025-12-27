-- Create attachments table for all entity types
CREATE TABLE public.attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL, -- 'customer', 'employee', 'product', 'invoice', 'quotation', 'sales_order', 'purchase_order', 'supplier', 'profile'
  entity_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL, -- 'image', 'document', 'spreadsheet', 'archive', 'other'
  file_size INTEGER NOT NULL,
  mime_type TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.attachments ENABLE ROW LEVEL SECURITY;

-- Create index for faster lookups
CREATE INDEX idx_attachments_entity ON public.attachments(entity_type, entity_id);

-- RLS Policies
-- Authenticated users can view attachments based on their role
CREATE POLICY "Authenticated can view attachments" ON public.attachments
FOR SELECT USING (
  CASE entity_type
    WHEN 'employee' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr') OR uploaded_by = auth.uid()
    WHEN 'customer' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales') OR has_role(auth.uid(), 'accountant')
    WHEN 'supplier' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse')
    WHEN 'product' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse')
    WHEN 'invoice' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales') OR has_role(auth.uid(), 'accountant')
    WHEN 'quotation' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales')
    WHEN 'sales_order' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales')
    WHEN 'purchase_order' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse')
    WHEN 'profile' THEN auth.uid()::text = entity_id::text OR has_role(auth.uid(), 'admin')
    ELSE false
  END
);

-- Insert policy based on role
CREATE POLICY "Role-based attachment upload" ON public.attachments
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND
  CASE entity_type
    WHEN 'employee' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'hr')
    WHEN 'customer' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales')
    WHEN 'supplier' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse')
    WHEN 'product' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse')
    WHEN 'invoice' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales') OR has_role(auth.uid(), 'accountant')
    WHEN 'quotation' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales')
    WHEN 'sales_order' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'sales')
    WHEN 'purchase_order' THEN has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'warehouse')
    WHEN 'profile' THEN auth.uid()::text = entity_id::text
    ELSE false
  END
);

-- Delete policy - admin or uploader
CREATE POLICY "Admin or uploader can delete" ON public.attachments
FOR DELETE USING (
  has_role(auth.uid(), 'admin') OR uploaded_by = auth.uid()
);

-- Create documents storage bucket (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);

-- Storage policies for documents bucket
CREATE POLICY "Authenticated can view documents" ON storage.objects
FOR SELECT USING (
  bucket_id = 'documents' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Authenticated can upload documents" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'documents' AND auth.uid() IS NOT NULL
);

CREATE POLICY "Admin or uploader can delete documents" ON storage.objects
FOR DELETE USING (
  bucket_id = 'documents' AND 
  (has_role(auth.uid(), 'admin') OR (auth.uid())::text = (storage.foldername(name))[1])
);