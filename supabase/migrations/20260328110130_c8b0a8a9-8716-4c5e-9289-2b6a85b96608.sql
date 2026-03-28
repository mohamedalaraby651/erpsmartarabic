
-- Price Lists table
CREATE TABLE public.price_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Price List Items
CREATE TABLE public.price_list_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  price_list_id UUID NOT NULL REFERENCES public.price_lists(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL DEFAULT 0,
  min_quantity INTEGER DEFAULT 1,
  discount_percentage NUMERIC DEFAULT 0,
  tenant_id UUID REFERENCES public.tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(price_list_id, product_id, min_quantity)
);

-- Link customers to price lists
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS price_list_id UUID REFERENCES public.price_lists(id);

-- RLS
ALTER TABLE public.price_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for price_lists" ON public.price_lists
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT get_current_tenant()));

CREATE POLICY "Tenant isolation for price_list_items" ON public.price_list_items
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT get_current_tenant()));

-- Indexes
CREATE INDEX idx_price_list_items_list ON public.price_list_items(price_list_id);
CREATE INDEX idx_price_list_items_product ON public.price_list_items(product_id);
CREATE INDEX idx_price_lists_tenant ON public.price_lists(tenant_id);
CREATE INDEX idx_customers_price_list ON public.customers(price_list_id);
