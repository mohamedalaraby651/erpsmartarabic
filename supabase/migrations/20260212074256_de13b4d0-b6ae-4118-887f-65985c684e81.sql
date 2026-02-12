
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS governorate text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS discount_percentage numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contact_person text,
  ADD COLUMN IF NOT EXISTS contact_person_role text,
  ADD COLUMN IF NOT EXISTS payment_terms_days integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preferred_payment_method text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS last_transaction_date timestamptz;
