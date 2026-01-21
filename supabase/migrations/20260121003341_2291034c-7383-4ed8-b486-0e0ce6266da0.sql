-- 1. تصنيفات المصروفات
CREATE TABLE public.expense_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  parent_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;

-- Policies for expense_categories
CREATE POLICY "Admins can manage expense categories"
ON public.expense_categories FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants can manage expense categories"
ON public.expense_categories FOR ALL
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Authenticated can view expense categories"
ON public.expense_categories FOR SELECT
USING (true);

-- 2. صناديق النقدية
CREATE TABLE public.cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  current_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  assigned_to UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

-- Policies for cash_registers
CREATE POLICY "Admins can manage cash registers"
ON public.cash_registers FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants can manage cash registers"
ON public.cash_registers FOR ALL
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Authenticated can view cash registers"
ON public.cash_registers FOR SELECT
USING (true);

-- 3. حركات الصندوق
CREATE TABLE public.cash_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_number TEXT NOT NULL UNIQUE,
  register_id UUID NOT NULL REFERENCES public.cash_registers(id) ON DELETE RESTRICT,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense', 'transfer_in', 'transfer_out', 'adjustment')),
  amount NUMERIC NOT NULL CHECK (amount > 0),
  balance_after NUMERIC NOT NULL,
  reference_type TEXT, -- 'payment', 'expense', 'supplier_payment', 'transfer', 'manual'
  reference_id UUID,
  description TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

-- Policies for cash_transactions
CREATE POLICY "Admins can manage cash transactions"
ON public.cash_transactions FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants can manage cash transactions"
ON public.cash_transactions FOR ALL
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Authenticated can view cash transactions"
ON public.cash_transactions FOR SELECT
USING (true);

-- 4. المصروفات
CREATE TABLE public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_number TEXT NOT NULL UNIQUE,
  category_id UUID REFERENCES public.expense_categories(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank', 'card')),
  register_id UUID REFERENCES public.cash_registers(id) ON DELETE SET NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  receipt_url TEXT,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  approved_by UUID,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

-- Policies for expenses
CREATE POLICY "Admins can manage expenses"
ON public.expenses FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants can manage expenses"
ON public.expenses FOR ALL
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Users can create expenses"
ON public.expenses FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can view own expenses"
ON public.expenses FOR SELECT
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'accountant'::app_role));

-- 5. حسابات البنوك
CREATE TABLE public.bank_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_name TEXT NOT NULL,
  account_name TEXT NOT NULL,
  account_number TEXT,
  iban TEXT,
  current_balance NUMERIC DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;

-- Policies for bank_accounts
CREATE POLICY "Admins can manage bank accounts"
ON public.bank_accounts FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Accountants can manage bank accounts"
ON public.bank_accounts FOR ALL
USING (has_role(auth.uid(), 'accountant'::app_role));

CREATE POLICY "Authenticated can view bank accounts"
ON public.bank_accounts FOR SELECT
USING (true);

-- Triggers for updated_at
CREATE TRIGGER update_expense_categories_updated_at
BEFORE UPDATE ON public.expense_categories
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_registers_updated_at
BEFORE UPDATE ON public.cash_registers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
BEFORE UPDATE ON public.expenses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bank_accounts_updated_at
BEFORE UPDATE ON public.bank_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate expense number
CREATE OR REPLACE FUNCTION generate_expense_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expense_number IS NULL OR NEW.expense_number = '' THEN
    NEW.expense_number := 'EXP-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('expense_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for expense numbers
CREATE SEQUENCE IF NOT EXISTS expense_seq START 1;

-- Trigger for auto-generating expense number
CREATE TRIGGER set_expense_number
BEFORE INSERT ON public.expenses
FOR EACH ROW EXECUTE FUNCTION generate_expense_number();

-- Function to generate cash transaction number
CREATE OR REPLACE FUNCTION generate_cash_transaction_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.transaction_number IS NULL OR NEW.transaction_number = '' THEN
    NEW.transaction_number := 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('cash_txn_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Sequence for transaction numbers
CREATE SEQUENCE IF NOT EXISTS cash_txn_seq START 1;

-- Trigger for auto-generating transaction number
CREATE TRIGGER set_cash_transaction_number
BEFORE INSERT ON public.cash_transactions
FOR EACH ROW EXECUTE FUNCTION generate_cash_transaction_number();