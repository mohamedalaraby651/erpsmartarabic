-- Create supplier_payments table
CREATE TABLE public.supplier_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_number TEXT UNIQUE NOT NULL,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  purchase_order_id UUID REFERENCES public.purchase_orders(id),
  amount DECIMAL(12,2) NOT NULL,
  payment_method public.payment_method NOT NULL DEFAULT 'cash',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reference_number TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.supplier_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for supplier_payments
CREATE POLICY "Admin or accountant can manage supplier payments"
  ON public.supplier_payments
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'));

CREATE POLICY "Authenticated can view supplier payments"
  ON public.supplier_payments
  FOR SELECT
  USING (true);

-- Add /tasks to routeLabels - done in code
-- Insert default role permissions for existing custom roles

-- Get all custom roles and insert default section permissions
DO $$
DECLARE
  role_record RECORD;
BEGIN
  FOR role_record IN SELECT id, name FROM public.custom_roles LOOP
    -- Insert section permissions for each role
    INSERT INTO public.role_section_permissions (role_id, section, can_view, can_create, can_edit, can_delete)
    VALUES
      -- Dashboard - everyone can view
      (role_record.id, 'dashboard', true, false, false, false),
      -- Customers
      (role_record.id, 'customers', 
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'Accountant', 'admin', 'sales', 'accountant') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'admin', 'sales') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'admin', 'sales') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END
      ),
      -- Products
      (role_record.id, 'products',
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'Sales', 'admin', 'warehouse', 'sales') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END
      ),
      -- Inventory
      (role_record.id, 'inventory',
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END
      ),
      -- Suppliers
      (role_record.id, 'suppliers',
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END
      ),
      -- Purchase Orders
      (role_record.id, 'purchase_orders',
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Warehouse', 'admin', 'warehouse') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END
      ),
      -- Quotations
      (role_record.id, 'quotations',
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'admin', 'sales') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'admin', 'sales') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'admin', 'sales') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END
      ),
      -- Sales Orders
      (role_record.id, 'sales_orders',
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'admin', 'sales') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'admin', 'sales') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'admin', 'sales') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END
      ),
      -- Invoices
      (role_record.id, 'invoices',
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'Accountant', 'admin', 'sales', 'accountant') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Sales', 'Accountant', 'admin', 'sales', 'accountant') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Accountant', 'admin', 'accountant') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END
      ),
      -- Payments
      (role_record.id, 'payments',
        CASE WHEN role_record.name IN ('Admin', 'Accountant', 'admin', 'accountant') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Accountant', 'admin', 'accountant') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'Accountant', 'admin', 'accountant') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END
      ),
      -- Reports
      (role_record.id, 'reports',
        CASE WHEN role_record.name IN ('Admin', 'Accountant', 'admin', 'accountant') THEN true ELSE false END,
        false, false, false
      ),
      -- Settings
      (role_record.id, 'settings',
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END,
        CASE WHEN role_record.name IN ('Admin', 'admin') THEN true ELSE false END
      )
    ON CONFLICT DO NOTHING;
  END LOOP;
END $$;