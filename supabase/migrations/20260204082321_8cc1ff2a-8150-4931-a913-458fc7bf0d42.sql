-- =============================================
-- PHASE 1.2: ADD tenant_id TO ALL BUSINESS TABLES
-- =============================================

-- Core Business Tables
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.suppliers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.employees ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Categories
ALTER TABLE public.product_categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.customer_categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.expense_categories ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Sales Documents
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.invoice_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.quotations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.quotation_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.sales_orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.sales_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Purchase Documents
ALTER TABLE public.purchase_orders ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.purchase_order_items ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Payments & Finance
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.supplier_payments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Inventory
ALTER TABLE public.warehouses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.product_stock ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.stock_movements ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.product_variants ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Treasury
ALTER TABLE public.cash_registers ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.cash_transactions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.bank_accounts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Accounting
ALTER TABLE public.chart_of_accounts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.journals ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.journal_entries ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.fiscal_periods ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Customer Related
ALTER TABLE public.customer_addresses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- System & Settings
ALTER TABLE public.company_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.attachments ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.export_templates ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.push_subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Roles & Permissions (tenant-scoped)
ALTER TABLE public.custom_roles ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.role_section_permissions ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);
ALTER TABLE public.role_limits ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Section Customizations
ALTER TABLE public.section_customizations ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- System Settings
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Tasks
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Create indexes for tenant_id on all tables for query performance
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON public.customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant ON public.products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON public.suppliers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_employees_tenant ON public.employees(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON public.invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotations_tenant ON public.quotations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_orders_tenant ON public.sales_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_tenant ON public.purchase_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON public.payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant ON public.expenses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_journals_tenant ON public.journals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_tenant ON public.cash_registers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_tenant ON public.cash_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_stock_tenant ON public.product_stock(tenant_id);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON public.warehouses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_tenant ON public.chart_of_accounts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_tenant ON public.activity_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON public.notifications(tenant_id);