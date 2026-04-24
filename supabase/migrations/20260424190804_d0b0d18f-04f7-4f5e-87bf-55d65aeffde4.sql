-- ============================================
-- Phase 3: Financial protection triggers
-- ============================================

-- Helper: check if a journal exists for a (source_type, source_id)
CREATE OR REPLACE FUNCTION public._has_posted_journal(_source_type text, _source_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.journals
    WHERE source_type = _source_type
      AND source_id = _source_id
      AND COALESCE(is_posted, false) = true
  );
$$;

-- ============================================
-- 1. INVOICES — block mutations once journal exists
-- ============================================
CREATE OR REPLACE FUNCTION public.prevent_approved_invoice_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public._has_posted_journal('invoice', OLD.id) THEN
      RAISE EXCEPTION 'لا يمكن حذف فاتورة لها قيد محاسبي مرحّل. استخدم void_invoice بدلاً من ذلك.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: allow only specific status transitions and benign fields
  IF public._has_posted_journal('invoice', NEW.id) THEN
    -- Allow void path: status -> cancelled (handled by void_invoice RPC) and notes/rejection_reason
    IF (NEW.subtotal IS DISTINCT FROM OLD.subtotal)
       OR (NEW.total_amount IS DISTINCT FROM OLD.total_amount)
       OR (NEW.tax_amount IS DISTINCT FROM OLD.tax_amount)
       OR (NEW.discount_amount IS DISTINCT FROM OLD.discount_amount)
       OR (NEW.customer_id IS DISTINCT FROM OLD.customer_id)
       OR (NEW.invoice_number IS DISTINCT FROM OLD.invoice_number)
    THEN
      RAISE EXCEPTION 'لا يمكن تعديل البيانات المالية لفاتورة مرحّلة. استخدم void_invoice ثم أنشئ فاتورة جديدة.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_approved_invoice_mutation ON public.invoices;
CREATE TRIGGER trg_prevent_approved_invoice_mutation
  BEFORE UPDATE OR DELETE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_approved_invoice_mutation();

-- ============================================
-- 2. PAYMENTS — block mutations once posted
-- ============================================
CREATE OR REPLACE FUNCTION public.prevent_posted_payment_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public._has_posted_journal('payment', OLD.id) THEN
      RAISE EXCEPTION 'لا يمكن حذف دفعة مرحّلة محاسبياً. أنشئ دفعة استرداد عكسية بدلاً من ذلك.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF public._has_posted_journal('payment', NEW.id) THEN
    IF (NEW.amount IS DISTINCT FROM OLD.amount)
       OR (NEW.customer_id IS DISTINCT FROM OLD.customer_id)
       OR (NEW.invoice_id IS DISTINCT FROM OLD.invoice_id)
       OR (NEW.payment_method IS DISTINCT FROM OLD.payment_method)
       OR (NEW.payment_date IS DISTINCT FROM OLD.payment_date)
    THEN
      RAISE EXCEPTION 'لا يمكن تعديل البيانات المالية لدفعة مرحّلة. أنشئ دفعة عكسية بدلاً من ذلك.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_posted_payment_mutation ON public.payments;
CREATE TRIGGER trg_prevent_posted_payment_mutation
  BEFORE UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_posted_payment_mutation();

-- ============================================
-- 3. EXPENSES — block mutations once posted
-- ============================================
CREATE OR REPLACE FUNCTION public.prevent_posted_expense_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF public._has_posted_journal('expense', OLD.id) THEN
      RAISE EXCEPTION 'لا يمكن حذف مصروف مرحّل محاسبياً.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  IF public._has_posted_journal('expense', NEW.id) THEN
    IF (NEW.amount IS DISTINCT FROM OLD.amount)
       OR (NEW.category_id IS DISTINCT FROM OLD.category_id)
       OR (NEW.expense_date IS DISTINCT FROM OLD.expense_date)
       OR (NEW.payment_method IS DISTINCT FROM OLD.payment_method)
       OR (NEW.expense_number IS DISTINCT FROM OLD.expense_number)
    THEN
      RAISE EXCEPTION 'لا يمكن تعديل البيانات المالية لمصروف مرحّل.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_posted_expense_mutation ON public.expenses;
CREATE TRIGGER trg_prevent_posted_expense_mutation
  BEFORE UPDATE OR DELETE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_posted_expense_mutation();

-- ============================================
-- 4. JOURNALS — fully immutable once posted
-- ============================================
CREATE OR REPLACE FUNCTION public.prevent_posted_journal_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF COALESCE(OLD.is_posted, false) THEN
      RAISE EXCEPTION 'لا يمكن حذف قيد مرحّل. استخدم قيد عكسي بدلاً من ذلك.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE: once posted, only the description can change
  IF COALESCE(OLD.is_posted, false) THEN
    IF (NEW.total_debit IS DISTINCT FROM OLD.total_debit)
       OR (NEW.total_credit IS DISTINCT FROM OLD.total_credit)
       OR (NEW.journal_date IS DISTINCT FROM OLD.journal_date)
       OR (NEW.fiscal_period_id IS DISTINCT FROM OLD.fiscal_period_id)
       OR (NEW.source_type IS DISTINCT FROM OLD.source_type)
       OR (NEW.source_id IS DISTINCT FROM OLD.source_id)
       OR (NEW.is_posted IS DISTINCT FROM OLD.is_posted)
    THEN
      RAISE EXCEPTION 'لا يمكن تعديل قيد مرحّل. الحقول الحساسة محمية.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_posted_journal_mutation ON public.journals;
CREATE TRIGGER trg_prevent_posted_journal_mutation
  BEFORE UPDATE OR DELETE ON public.journals
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_posted_journal_mutation();

-- ============================================
-- 5. JOURNAL ENTRIES — no add/edit/delete on lines of a posted journal
-- ============================================
CREATE OR REPLACE FUNCTION public.prevent_posted_journal_entry_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _is_posted boolean;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(is_posted, false) INTO _is_posted FROM public.journals WHERE id = NEW.journal_id;
    -- Allow inserts during the SECURITY DEFINER posting RPCs (they run as the journal owner).
    -- We must allow lines to be added when the journal row was just inserted as posted.
    -- Strategy: only block if journal already had lines (i.e. mutation after the fact).
    IF _is_posted AND EXISTS (
      SELECT 1 FROM public.journal_entries
      WHERE journal_id = NEW.journal_id AND id <> NEW.id
        AND created_at < (now() - interval '5 seconds')
    ) THEN
      RAISE EXCEPTION 'لا يمكن إضافة سطور لقيد مرحّل سابق.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT COALESCE(is_posted, false) INTO _is_posted FROM public.journals WHERE id = OLD.journal_id;
    IF _is_posted THEN
      RAISE EXCEPTION 'لا يمكن حذف سطر من قيد مرحّل.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN OLD;
  END IF;

  -- UPDATE
  SELECT COALESCE(is_posted, false) INTO _is_posted FROM public.journals WHERE id = NEW.journal_id;
  IF _is_posted THEN
    IF (NEW.debit_amount IS DISTINCT FROM OLD.debit_amount)
       OR (NEW.credit_amount IS DISTINCT FROM OLD.credit_amount)
       OR (NEW.account_id IS DISTINCT FROM OLD.account_id)
    THEN
      RAISE EXCEPTION 'لا يمكن تعديل المبالغ أو الحساب لسطر قيد مرحّل.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_posted_journal_entry_mutation ON public.journal_entries;
CREATE TRIGGER trg_prevent_posted_journal_entry_mutation
  BEFORE INSERT OR UPDATE OR DELETE ON public.journal_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_posted_journal_entry_mutation();