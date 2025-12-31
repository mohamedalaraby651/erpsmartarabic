-- Add new columns to suppliers table for professional profile
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS supplier_type text DEFAULT 'local',
ADD COLUMN IF NOT EXISTS category text DEFAULT 'other',
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_account text,
ADD COLUMN IF NOT EXISTS iban text,
ADD COLUMN IF NOT EXISTS rating integer DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
ADD COLUMN IF NOT EXISTS website text;

-- Create supplier_notes table for staff notes
CREATE TABLE IF NOT EXISTS public.supplier_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  note text NOT NULL,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on supplier_notes
ALTER TABLE public.supplier_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for supplier_notes
CREATE POLICY "Admin or warehouse can manage supplier notes"
ON public.supplier_notes
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'warehouse'::app_role));

CREATE POLICY "Authenticated can view supplier notes"
ON public.supplier_notes
FOR SELECT
USING (true);

-- Add comment for documentation
COMMENT ON COLUMN public.suppliers.supplier_type IS 'Type of supplier: local or international';
COMMENT ON COLUMN public.suppliers.category IS 'Category: raw_materials, spare_parts, services, equipment, packaging, logistics, other';
COMMENT ON COLUMN public.suppliers.rating IS 'Rating from 0 to 5 stars';