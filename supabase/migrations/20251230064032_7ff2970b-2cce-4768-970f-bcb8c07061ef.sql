-- Add category and expiry_date columns to attachments table
ALTER TABLE public.attachments 
ADD COLUMN IF NOT EXISTS category text DEFAULT 'other',
ADD COLUMN IF NOT EXISTS expiry_date date;

-- Create index for category searches
CREATE INDEX IF NOT EXISTS idx_attachments_category ON public.attachments(category);

-- Create index for expiry date queries
CREATE INDEX IF NOT EXISTS idx_attachments_expiry_date ON public.attachments(expiry_date);

-- Add comment for documentation
COMMENT ON COLUMN public.attachments.category IS 'File category: contract, identity, invoice, license, report, image, other';
COMMENT ON COLUMN public.attachments.expiry_date IS 'Document expiry date for tracking';
