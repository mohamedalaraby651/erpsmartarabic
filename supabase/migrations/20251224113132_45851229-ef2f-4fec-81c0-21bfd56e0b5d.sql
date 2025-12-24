-- إنشاء الأنواع (Enums)
CREATE TYPE public.app_role AS ENUM ('admin', 'sales', 'warehouse', 'accountant', 'hr');
CREATE TYPE public.customer_type AS ENUM ('individual', 'company', 'farm');
CREATE TYPE public.vip_level AS ENUM ('regular', 'silver', 'gold', 'platinum');
CREATE TYPE public.document_status AS ENUM ('draft', 'pending', 'approved', 'cancelled', 'completed');
CREATE TYPE public.payment_method AS ENUM ('cash', 'bank_transfer', 'credit', 'installment', 'advance_payment');
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'paid', 'overdue');
CREATE TYPE public.stock_movement_type AS ENUM ('in', 'out', 'transfer', 'adjustment');

-- وظيفة تحديث updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- جدول الملفات الشخصية
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL DEFAULT '',
    avatar_url TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول أدوار المستخدمين
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'sales',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, role)
);

-- جدول إعدادات الشركة
CREATE TABLE public.company_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name TEXT NOT NULL DEFAULT 'شركتي',
    logo_url TEXT,
    phone TEXT,
    phone2 TEXT,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    currency TEXT NOT NULL DEFAULT 'ج.م',
    primary_color TEXT DEFAULT '#2563eb',
    secondary_color TEXT DEFAULT '#1e40af',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول تصنيفات المنتجات
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    description TEXT,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول المنتجات
CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    sku TEXT UNIQUE,
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    description TEXT,
    image_url TEXT,
    cost_price DECIMAL(12,2) DEFAULT 0,
    selling_price DECIMAL(12,2) DEFAULT 0,
    length_cm DECIMAL(10,2),
    width_cm DECIMAL(10,2),
    height_cm DECIMAL(10,2),
    weight_kg DECIMAL(10,2),
    specifications JSONB DEFAULT '{}',
    min_stock INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول متغيرات المنتج
CREATE TABLE public.product_variants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    sku TEXT,
    additional_price DECIMAL(12,2) DEFAULT 0,
    specifications JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول تصنيفات العملاء
CREATE TABLE public.customer_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول العملاء
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    customer_type customer_type NOT NULL DEFAULT 'individual',
    vip_level vip_level NOT NULL DEFAULT 'regular',
    category_id UUID REFERENCES public.customer_categories(id) ON DELETE SET NULL,
    phone TEXT,
    phone2 TEXT,
    email TEXT,
    image_url TEXT,
    tax_number TEXT,
    credit_limit DECIMAL(12,2) DEFAULT 0,
    current_balance DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول عناوين العملاء
CREATE TABLE public.customer_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    label TEXT NOT NULL DEFAULT 'العنوان الرئيسي',
    address TEXT NOT NULL,
    city TEXT,
    governorate TEXT,
    is_default BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول الموردين
CREATE TABLE public.suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    phone2 TEXT,
    email TEXT,
    address TEXT,
    tax_number TEXT,
    current_balance DECIMAL(12,2) DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول المستودعات
CREATE TABLE public.warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول مخزون المنتجات
CREATE TABLE public.product_stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(product_id, variant_id, warehouse_id)
);

-- جدول حركات المخزون
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    variant_id UUID REFERENCES public.product_variants(id) ON DELETE CASCADE,
    from_warehouse_id UUID REFERENCES public.warehouses(id),
    to_warehouse_id UUID REFERENCES public.warehouses(id),
    movement_type stock_movement_type NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type TEXT,
    reference_id UUID,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول عروض الأسعار
CREATE TABLE public.quotations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_number TEXT UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    status document_status NOT NULL DEFAULT 'draft',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    valid_until DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول بنود عروض الأسعار
CREATE TABLE public.quotation_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id UUID NOT NULL REFERENCES public.quotations(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول أوامر البيع
CREATE TABLE public.sales_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    quotation_id UUID REFERENCES public.quotations(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    status document_status NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    delivery_date DATE,
    delivery_address TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول بنود أوامر البيع
CREATE TABLE public.sales_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول الفواتير
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL,
    order_id UUID REFERENCES public.sales_orders(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    status document_status NOT NULL DEFAULT 'pending',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    payment_method payment_method NOT NULL DEFAULT 'cash',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid_amount DECIMAL(12,2) DEFAULT 0,
    due_date DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول بنود الفواتير
CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    total_price DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول المدفوعات
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_number TEXT UNIQUE NOT NULL,
    invoice_id UUID REFERENCES public.invoices(id),
    customer_id UUID NOT NULL REFERENCES public.customers(id),
    amount DECIMAL(12,2) NOT NULL,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    reference_number TEXT,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول أوامر الشراء
CREATE TABLE public.purchase_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES public.suppliers(id),
    status document_status NOT NULL DEFAULT 'pending',
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    expected_date DATE,
    notes TEXT,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول بنود أوامر الشراء
CREATE TABLE public.purchase_order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id),
    variant_id UUID REFERENCES public.product_variants(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(12,2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول المهام
CREATE TABLE public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    due_date DATE,
    priority TEXT DEFAULT 'medium',
    is_completed BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- جدول الإشعارات
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- تفعيل RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- وظيفة فحص الأدوار
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
    )
$$;

-- وظيفة فحص أي دور
CREATE OR REPLACE FUNCTION public.has_any_role(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id)
$$;

-- وظيفة إنشاء ملف شخصي تلقائياً
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name) VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''));
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'sales');
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- محفزات التحديث
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_quotations_updated_at BEFORE UPDATE ON public.quotations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sales_orders_updated_at BEFORE UPDATE ON public.sales_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_company_settings_updated_at BEFORE UPDATE ON public.company_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- سياسات RLS للملفات الشخصية
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- سياسات RLS لأدوار المستخدمين
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- سياسات RLS لإعدادات الشركة
CREATE POLICY "Authenticated users can view settings" ON public.company_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage settings" ON public.company_settings FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- سياسات RLS للمنتجات
CREATE POLICY "Authenticated can view categories" ON public.product_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or warehouse can manage categories" ON public.product_categories FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));
CREATE POLICY "Authenticated can view products" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or warehouse can manage products" ON public.products FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));
CREATE POLICY "Authenticated can view variants" ON public.product_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or warehouse can manage variants" ON public.product_variants FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));

-- سياسات RLS للعملاء
CREATE POLICY "Authenticated can view customer categories" ON public.customer_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage customer categories" ON public.customer_categories FOR ALL USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can view customers" ON public.customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or sales can manage customers" ON public.customers FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'));
CREATE POLICY "Authenticated can view addresses" ON public.customer_addresses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or sales can manage addresses" ON public.customer_addresses FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'));

-- سياسات RLS للموردين
CREATE POLICY "Authenticated can view suppliers" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or warehouse can manage suppliers" ON public.suppliers FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));

-- سياسات RLS للمستودعات والمخزون
CREATE POLICY "Authenticated can view warehouses" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or warehouse can manage warehouses" ON public.warehouses FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));
CREATE POLICY "Authenticated can view stock" ON public.product_stock FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or warehouse can manage stock" ON public.product_stock FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));
CREATE POLICY "Authenticated can view movements" ON public.stock_movements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or warehouse can manage movements" ON public.stock_movements FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));

-- سياسات RLS للمبيعات
CREATE POLICY "Authenticated can view quotations" ON public.quotations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or sales can manage quotations" ON public.quotations FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'));
CREATE POLICY "Authenticated can view quotation items" ON public.quotation_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or sales can manage quotation items" ON public.quotation_items FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'));
CREATE POLICY "Authenticated can view orders" ON public.sales_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or sales can manage orders" ON public.sales_orders FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'));
CREATE POLICY "Authenticated can view order items" ON public.sales_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or sales can manage order items" ON public.sales_order_items FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales'));
CREATE POLICY "Authenticated can view invoices" ON public.invoices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or sales or accountant can manage invoices" ON public.invoices FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'accountant'));
CREATE POLICY "Authenticated can view invoice items" ON public.invoice_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or sales or accountant can manage invoice items" ON public.invoice_items FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'sales') OR public.has_role(auth.uid(), 'accountant'));
CREATE POLICY "Authenticated can view payments" ON public.payments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or accountant can manage payments" ON public.payments FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'accountant'));

-- سياسات RLS لأوامر الشراء
CREATE POLICY "Authenticated can view purchase orders" ON public.purchase_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or warehouse can manage purchase orders" ON public.purchase_orders FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));
CREATE POLICY "Authenticated can view purchase order items" ON public.purchase_order_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin or warehouse can manage purchase order items" ON public.purchase_order_items FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'warehouse'));

-- سياسات RLS للمهام والإشعارات
CREATE POLICY "Users can view assigned tasks" ON public.tasks FOR SELECT TO authenticated USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can create tasks" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE USING (assigned_to = auth.uid() OR created_by = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own notifications" ON public.notifications FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "System can create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

-- إضافة البيانات الافتراضية
INSERT INTO public.company_settings (company_name, currency) VALUES ('شركة معدات الدواجن', 'ج.م');
INSERT INTO public.warehouses (name, description) VALUES ('مستودع المواد الخام', 'مستودع لتخزين المواد الخام'), ('مستودع المنتجات النهائية', 'مستودع للمنتجات الجاهزة للبيع');
INSERT INTO public.customer_categories (name, description, discount_percentage) VALUES ('عملاء عاديون', 'عملاء بدون خصم', 0), ('عملاء VIP', 'عملاء مميزون مع خصم 5%', 5), ('موزعون', 'موزعون مع خصم 10%', 10);
INSERT INTO public.product_categories (name, description) VALUES ('معدات التغذية', 'معدات تغذية الدواجن'), ('معدات الشرب', 'معدات شرب الدواجن'), ('معدات التهوية', 'معدات التبريد والتهوية'), ('معدات الإضاءة', 'أنظمة الإضاءة'), ('معدات التدفئة', 'أنظمة التدفئة'), ('ملحقات ومستلزمات', 'مستلزمات متنوعة');