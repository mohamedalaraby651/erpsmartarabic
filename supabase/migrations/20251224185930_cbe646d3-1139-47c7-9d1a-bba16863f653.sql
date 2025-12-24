-- Fix: Restrict customer data access to admin, sales, and accountant roles only
-- Drop the overly permissive SELECT policy
DROP POLICY IF EXISTS "Authenticated can view customers" ON public.customers;

-- Create a role-based SELECT policy
CREATE POLICY "Role-based customer access" ON public.customers 
FOR SELECT 
TO authenticated 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'sales') OR 
  has_role(auth.uid(), 'accountant')
);

-- Also fix customer_addresses since it contains sensitive address data
DROP POLICY IF EXISTS "Authenticated can view addresses" ON public.customer_addresses;

CREATE POLICY "Role-based address access" ON public.customer_addresses 
FOR SELECT 
TO authenticated 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'sales') OR 
  has_role(auth.uid(), 'accountant')
);

-- Also fix customer_categories to be consistent
DROP POLICY IF EXISTS "Authenticated can view customer categories" ON public.customer_categories;

CREATE POLICY "Role-based customer categories access" ON public.customer_categories 
FOR SELECT 
TO authenticated 
USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'sales') OR 
  has_role(auth.uid(), 'accountant')
);