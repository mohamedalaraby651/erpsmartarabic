-- ============================================
-- Q2 Phase 2.1: Double-Entry Accounting System
-- ============================================

-- 1. Create ENUM types for accounting
CREATE TYPE account_type AS ENUM ('asset', 'liability', 'equity', 'revenue', 'expense');
CREATE TYPE balance_type AS ENUM ('debit', 'credit');

-- 2. Chart of Accounts (شجرة الحسابات)
CREATE TABLE chart_of_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  name_en TEXT,
  account_type account_type NOT NULL,
  parent_id UUID REFERENCES chart_of_accounts(id),
  is_active BOOLEAN DEFAULT true,
  normal_balance balance_type NOT NULL,
  current_balance DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Fiscal Periods (الفترات المالية)
CREATE TABLE fiscal_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN DEFAULT false,
  closed_at TIMESTAMPTZ,
  closed_by UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_period_dates CHECK (end_date > start_date)
);

-- 4. Journals (اليوميات/القيود)
CREATE SEQUENCE journal_seq START 1;

CREATE TABLE journals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fiscal_period_id UUID NOT NULL REFERENCES fiscal_periods(id),
  journal_number TEXT NOT NULL UNIQUE,
  journal_date DATE NOT NULL,
  description TEXT,
  is_posted BOOLEAN DEFAULT false,
  posted_at TIMESTAMPTZ,
  created_by UUID,
  source_type TEXT, -- invoice, payment, expense, manual, stock_movement
  source_id UUID,
  total_debit DECIMAL(15,2) DEFAULT 0,
  total_credit DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Journal Entries (بنود القيود)
CREATE TABLE journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES chart_of_accounts(id),
  line_number INTEGER NOT NULL,
  debit_amount DECIMAL(15,2) DEFAULT 0,
  credit_amount DECIMAL(15,2) DEFAULT 0,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT valid_entry_amounts CHECK (
    (debit_amount > 0 AND credit_amount = 0) OR
    (credit_amount > 0 AND debit_amount = 0) OR
    (debit_amount = 0 AND credit_amount = 0)
  )
);

-- 6. Auto-generate journal number trigger
CREATE OR REPLACE FUNCTION generate_journal_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.journal_number IS NULL OR NEW.journal_number = '' THEN
    NEW.journal_number := 'JRN-' || TO_CHAR(NEW.journal_date, 'YYYYMMDD') || '-' || LPAD(NEXTVAL('journal_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER auto_journal_number
BEFORE INSERT ON journals
FOR EACH ROW
EXECUTE FUNCTION generate_journal_number();

-- 7. Trigger to update journal totals
CREATE OR REPLACE FUNCTION update_journal_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  UPDATE journals
  SET 
    total_debit = (SELECT COALESCE(SUM(debit_amount), 0) FROM journal_entries WHERE journal_id = COALESCE(NEW.journal_id, OLD.journal_id)),
    total_credit = (SELECT COALESCE(SUM(credit_amount), 0) FROM journal_entries WHERE journal_id = COALESCE(NEW.journal_id, OLD.journal_id))
  WHERE id = COALESCE(NEW.journal_id, OLD.journal_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER update_journal_totals_trigger
AFTER INSERT OR UPDATE OR DELETE ON journal_entries
FOR EACH ROW
EXECUTE FUNCTION update_journal_totals();

-- 8. Validate journal balance before posting
CREATE OR REPLACE FUNCTION validate_journal_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.is_posted = true AND OLD.is_posted = false THEN
    -- Check if balanced
    IF NEW.total_debit != NEW.total_credit THEN
      RAISE EXCEPTION 'القيد غير متوازن: المدين (%) ≠ الدائن (%)', NEW.total_debit, NEW.total_credit;
    END IF;
    -- Check if has entries
    IF NEW.total_debit = 0 AND NEW.total_credit = 0 THEN
      RAISE EXCEPTION 'لا يمكن ترحيل قيد فارغ';
    END IF;
    NEW.posted_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER validate_journal_before_post
BEFORE UPDATE ON journals
FOR EACH ROW
EXECUTE FUNCTION validate_journal_balance();

-- ============================================
-- Q2 Phase 2.2: Two-Factor Authentication
-- ============================================

-- 9. User 2FA Settings
CREATE TABLE user_2fa_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  is_enabled BOOLEAN DEFAULT false,
  secret_key TEXT, -- encrypted TOTP secret
  backup_codes TEXT[], -- encrypted backup codes
  enabled_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================
-- Q2 Phase 2.3: Invoice Approval Workflow
-- ============================================

-- 10. Add approval columns to invoices
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by UUID,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- ============================================
-- RLS Policies
-- ============================================

-- Enable RLS on all new tables
ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE fiscal_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE journals ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_2fa_settings ENABLE ROW LEVEL SECURITY;

-- Chart of Accounts: Everyone views, admin/accountant manages
CREATE POLICY "chart_of_accounts_select" ON chart_of_accounts
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'accountant') OR
  check_section_permission(auth.uid(), 'accounting', 'view')
);

CREATE POLICY "chart_of_accounts_manage" ON chart_of_accounts
FOR ALL USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'accountant')
);

-- Fiscal Periods: Everyone views, admin manages
CREATE POLICY "fiscal_periods_select" ON fiscal_periods
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'accountant') OR
  check_section_permission(auth.uid(), 'accounting', 'view')
);

CREATE POLICY "fiscal_periods_manage" ON fiscal_periods
FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Journals: Admin/Accountant only
CREATE POLICY "journals_select" ON journals
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'accountant') OR
  check_section_permission(auth.uid(), 'accounting', 'view')
);

CREATE POLICY "journals_insert" ON journals
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'accountant')
);

CREATE POLICY "journals_update" ON journals
FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'accountant')
);

CREATE POLICY "journals_delete" ON journals
FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- Journal Entries: Same as journals
CREATE POLICY "journal_entries_select" ON journal_entries
FOR SELECT USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'accountant') OR
  check_section_permission(auth.uid(), 'accounting', 'view')
);

CREATE POLICY "journal_entries_insert" ON journal_entries
FOR INSERT WITH CHECK (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'accountant')
);

CREATE POLICY "journal_entries_update" ON journal_entries
FOR UPDATE USING (
  has_role(auth.uid(), 'admin') OR 
  has_role(auth.uid(), 'accountant')
);

CREATE POLICY "journal_entries_delete" ON journal_entries
FOR DELETE USING (has_role(auth.uid(), 'admin'));

-- User 2FA Settings: User can only manage their own
CREATE POLICY "user_2fa_own" ON user_2fa_settings
FOR ALL USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================
-- Default Chart of Accounts (Arabic ERP Standard)
-- ============================================

INSERT INTO chart_of_accounts (code, name, name_en, account_type, normal_balance, description) VALUES
-- Assets (الأصول)
('1000', 'الأصول', 'Assets', 'asset', 'debit', 'إجمالي الأصول'),
('1100', 'الأصول المتداولة', 'Current Assets', 'asset', 'debit', 'الأصول المتداولة'),
('1110', 'النقدية', 'Cash', 'asset', 'debit', 'النقدية في الصندوق'),
('1120', 'البنوك', 'Banks', 'asset', 'debit', 'الأرصدة البنكية'),
('1130', 'ذمم العملاء', 'Accounts Receivable', 'asset', 'debit', 'المستحقات من العملاء'),
('1140', 'المخزون', 'Inventory', 'asset', 'debit', 'المخزون السلعي'),
('1150', 'مصروفات مدفوعة مقدماً', 'Prepaid Expenses', 'asset', 'debit', 'مصروفات مدفوعة مقدماً'),

-- Liabilities (الخصوم)
('2000', 'الخصوم', 'Liabilities', 'liability', 'credit', 'إجمالي الخصوم'),
('2100', 'الخصوم المتداولة', 'Current Liabilities', 'liability', 'credit', 'الخصوم المتداولة'),
('2110', 'ذمم الموردين', 'Accounts Payable', 'liability', 'credit', 'المستحقات للموردين'),
('2120', 'ضريبة القيمة المضافة', 'VAT Payable', 'liability', 'credit', 'ضريبة القيمة المضافة المستحقة'),
('2130', 'مصروفات مستحقة', 'Accrued Expenses', 'liability', 'credit', 'مصروفات مستحقة الدفع'),

-- Equity (حقوق الملكية)
('3000', 'حقوق الملكية', 'Equity', 'equity', 'credit', 'حقوق الملكية'),
('3100', 'رأس المال', 'Capital', 'equity', 'credit', 'رأس المال المدفوع'),
('3200', 'الأرباح المحتجزة', 'Retained Earnings', 'equity', 'credit', 'الأرباح المحتجزة'),

-- Revenue (الإيرادات)
('4000', 'الإيرادات', 'Revenue', 'revenue', 'credit', 'إجمالي الإيرادات'),
('4100', 'إيرادات المبيعات', 'Sales Revenue', 'revenue', 'credit', 'إيرادات المبيعات'),
('4200', 'إيرادات الخدمات', 'Service Revenue', 'revenue', 'credit', 'إيرادات الخدمات'),
('4900', 'إيرادات أخرى', 'Other Revenue', 'revenue', 'credit', 'إيرادات متنوعة'),

-- Expenses (المصروفات)
('5000', 'المصروفات', 'Expenses', 'expense', 'debit', 'إجمالي المصروفات'),
('5100', 'تكلفة المبيعات', 'Cost of Sales', 'expense', 'debit', 'تكلفة البضاعة المباعة'),
('5200', 'مصروفات الرواتب', 'Salary Expenses', 'expense', 'debit', 'مصروفات الرواتب والأجور'),
('5300', 'مصروفات الإيجار', 'Rent Expenses', 'expense', 'debit', 'مصروفات الإيجار'),
('5400', 'مصروفات المرافق', 'Utilities Expenses', 'expense', 'debit', 'مصروفات الكهرباء والماء'),
('5500', 'مصروفات النقل', 'Transportation Expenses', 'expense', 'debit', 'مصروفات النقل والشحن'),
('5600', 'مصروفات التسويق', 'Marketing Expenses', 'expense', 'debit', 'مصروفات الإعلان والتسويق'),
('5900', 'مصروفات أخرى', 'Other Expenses', 'expense', 'debit', 'مصروفات متنوعة');

-- Update parent_id for hierarchy
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '1000') WHERE code IN ('1100');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '1100') WHERE code IN ('1110', '1120', '1130', '1140', '1150');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '2000') WHERE code IN ('2100');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '2100') WHERE code IN ('2110', '2120', '2130');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '3000') WHERE code IN ('3100', '3200');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '4000') WHERE code IN ('4100', '4200', '4900');
UPDATE chart_of_accounts SET parent_id = (SELECT id FROM chart_of_accounts WHERE code = '5000') WHERE code IN ('5100', '5200', '5300', '5400', '5500', '5600', '5900');

-- Create default fiscal period (current year)
INSERT INTO fiscal_periods (name, start_date, end_date) VALUES
('السنة المالية 2025', '2025-01-01', '2025-12-31');

-- Add indexes for performance
CREATE INDEX idx_chart_of_accounts_parent ON chart_of_accounts(parent_id);
CREATE INDEX idx_chart_of_accounts_type ON chart_of_accounts(account_type);
CREATE INDEX idx_journals_date ON journals(journal_date);
CREATE INDEX idx_journals_period ON journals(fiscal_period_id);
CREATE INDEX idx_journals_source ON journals(source_type, source_id);
CREATE INDEX idx_journal_entries_account ON journal_entries(account_id);
CREATE INDEX idx_journal_entries_journal ON journal_entries(journal_id);
CREATE INDEX idx_invoices_approval ON invoices(approval_status);

-- Add activity log triggers for new tables
CREATE TRIGGER log_chart_of_accounts_changes
AFTER INSERT OR UPDATE OR DELETE ON chart_of_accounts
FOR EACH ROW EXECUTE FUNCTION log_activity();

CREATE TRIGGER log_journals_changes
AFTER INSERT OR UPDATE OR DELETE ON journals
FOR EACH ROW EXECUTE FUNCTION log_activity();