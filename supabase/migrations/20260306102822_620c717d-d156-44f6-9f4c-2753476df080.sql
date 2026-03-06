
-- Temporarily disable USER triggers only (not system FK triggers)
ALTER TABLE public.customers DISABLE TRIGGER USER;
ALTER TABLE public.suppliers DISABLE TRIGGER USER;
ALTER TABLE public.products DISABLE TRIGGER USER;
ALTER TABLE public.company_settings DISABLE TRIGGER USER;

-- Clean customers
UPDATE public.customers SET
  name = regexp_replace(name, E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', '', 'g'),
  notes = regexp_replace(COALESCE(notes,''), E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', '', 'g'),
  contact_person = regexp_replace(COALESCE(contact_person,''), E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', '', 'g')
WHERE name ~ E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]'
   OR notes ~ E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]'
   OR contact_person ~ E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]';

-- Clean suppliers
UPDATE public.suppliers SET
  name = regexp_replace(name, E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', '', 'g'),
  notes = regexp_replace(COALESCE(notes,''), E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', '', 'g'),
  contact_person = regexp_replace(COALESCE(contact_person,''), E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', '', 'g')
WHERE name ~ E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]'
   OR notes ~ E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]'
   OR contact_person ~ E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]';

-- Clean products
UPDATE public.products SET
  name = regexp_replace(name, E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', '', 'g'),
  description = regexp_replace(COALESCE(description,''), E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', '', 'g')
WHERE name ~ E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]'
   OR description ~ E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]';

-- Clean company_settings
UPDATE public.company_settings SET
  company_name = regexp_replace(company_name, E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', '', 'g'),
  address = regexp_replace(COALESCE(address,''), E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]', '', 'g')
WHERE company_name ~ E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]'
   OR address ~ E'[\\u200E\\u200F\\u061C\\u200B\\u200C\\u200D\\uFEFF\\u202A-\\u202E\\u2066-\\u2069]';

-- Re-enable user triggers
ALTER TABLE public.customers ENABLE TRIGGER USER;
ALTER TABLE public.suppliers ENABLE TRIGGER USER;
ALTER TABLE public.products ENABLE TRIGGER USER;
ALTER TABLE public.company_settings ENABLE TRIGGER USER;
