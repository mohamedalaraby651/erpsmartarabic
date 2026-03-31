

# تقرير تحليل تضارب الأرقام المالية — وحدة العملاء

---

## 1. السبب الجذري لتضارب الأرقام

النظام يحسب الأرقام المالية من **3 مصادر مختلفة غير متزامنة**:

```text
┌─────────────────────────────────────────────────────────┐
│              3 مصادر = 3 أرقام مختلفة                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  1. customer.current_balance (عمود في DB)               │
│     ← يُنقص عند الدفع (process-payment edge fn)        │
│     ← لا يُزاد عند إنشاء فاتورة! ❌                    │
│                                                         │
│  2. calculateCustomerHealth() (حساب frontend)           │
│     ← SUM(invoices.total_amount) = إجمالي المشتريات    │
│     ← SUM(payments.amount) = إجمالي المدفوعات          │
│     ← لا علاقة له بـ current_balance                    │
│                                                         │
│  3. CustomerTabInvoices summary (حساب frontend آخر)     │
│     ← SUM(invoice.paid_amount) = المدفوع                │
│     ← outstanding = total - paid_amount                 │
│     ← يختلف عن #2 لأنه يستخدم paid_amount              │
│       بدلاً من جدول payments                             │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### المشاكل الحرجة المكتشفة:

**مشكلة 1 — `current_balance` لا يتأثر بالفواتير الجديدة**
- عند إنشاء فاتورة: لا يوجد trigger أو edge function يزيد `current_balance`
- عند الدفع: `process-payment` ينقص `current_balance`
- **النتيجة**: `current_balance` يصبح سالباً بعد أول دفعة لأنه بدأ من 0

**مشكلة 2 — `totalPurchases` في StatsGrid ≠ `totalInvoiced` في Tab**
- `StatsGrid` يستخدم `calculateCustomerHealth()` → `SUM(invoices.total_amount)`
- `TabInvoices` summary يستخدم نفس الحساب (متطابقان حالياً)
- لكن `totalPayments` في StatsGrid = `SUM(payments.amount)` من جدول payments
- بينما `totalPaid` في TabInvoices = `SUM(invoice.paid_amount)` من عمود الفاتورة
- **إذا وُجدت دفعة بدون فاتورة مرتبطة**: الرقمان يختلفان

**مشكلة 3 — Race condition في `process-payment`**
```typescript
// سطر 199 في process-payment/index.ts
const newBalance = (customer.current_balance || 0) - paymentData.amount;
```
- يقرأ القيمة القديمة ثم يكتب الجديدة — إذا تمت دفعتان بالتوالي، واحدة ستُفقد
- الحل: استخدام `current_balance - amount` في SQL مباشرة

**مشكلة 4 — `reverse_payment_on_delete` عكسي أيضاً**
```sql
SET current_balance = current_balance - OLD.amount
```
- هذا **ينقص** الرصيد عند حذف الدفعة! المفروض **يزيده** (لأن الدفعة كانت تنقصه)
- **خطأ في الاتجاه**: يجب أن يكون `current_balance + OLD.amount`

---

## 2. خطة الإصلاح الشاملة

### الإصلاح 1 — توحيد مصدر الحقيقة لـ `current_balance` (Migration)

إنشاء trigger واحد على جدول `invoices` يزيد `current_balance` عند الإنشاء:

```sql
-- عند إنشاء/تعديل فاتورة → يُحدّث current_balance
CREATE OR REPLACE FUNCTION update_customer_balance_on_invoice()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE customers 
    SET current_balance = current_balance + NEW.total_amount
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'UPDATE' AND OLD.total_amount != NEW.total_amount THEN
    UPDATE customers 
    SET current_balance = current_balance + (NEW.total_amount - OLD.total_amount)
    WHERE id = NEW.customer_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE customers 
    SET current_balance = current_balance - OLD.total_amount
    WHERE id = OLD.customer_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

إصلاح trigger حذف الدفعة (الاتجاه معكوس):
```sql
-- إصلاح: عند حذف دفعة يجب إعادة الرصيد (زيادة وليس نقصان)
SET current_balance = current_balance + OLD.amount  -- كان: - OLD.amount ❌
```

إصلاح race condition في `process-payment`:
```sql
-- بدلاً من القراءة ثم الكتابة
UPDATE customers 
SET current_balance = current_balance - amount
WHERE id = customer_id;
```

تشغيل إعادة حساب لمرة واحدة لتصحيح الأرصدة الحالية:
```sql
UPDATE customers SET current_balance = (
  COALESCE((SELECT SUM(total_amount) FROM invoices WHERE customer_id = customers.id), 0)
  - COALESCE((SELECT SUM(amount) FROM payments WHERE customer_id = customers.id), 0)
);
```

### الإصلاح 2 — توحيد حسابات Frontend

تعديل `calculateCustomerHealth()` ليحسب "المتبقي" كرقم واحد متسق:

```typescript
// إضافة totalOutstanding
const totalOutstanding = totalPurchases - totalPayments;
```

تعديل `CustomerTabInvoices` summary ليستخدم **نفس المنطق** أو يوضح الفرق:
- حالياً: `outstanding = SUM(invoice.total_amount) - SUM(invoice.paid_amount)`
- المشكلة: دفعات بدون فاتورة مرتبطة لا تظهر هنا
- الحل: إضافة تنبيه "يوجد X دفعة غير مرتبطة بفواتير" عند وجود فرق

### الإصلاح 3 — إضافة "المستحق" إلى StatsGrid

حالياً StatsGrid يعرض: الرصيد، المشتريات، نسبة السداد، عدد الفواتير، المتوسط، DSO، CLV، آخر شراء.

**المفقود**: لا يوجد رقم واحد واضح يقول "المستحق على العميل = المشتريات - المدفوعات".

الحل: استبدال "قيمة العميل CLV" (التي تساوي `totalPurchases` — مكررة!) بـ **"المستحق"**:
```text
المستحق = totalPurchases - totalPayments
```

---

## 3. الملفات المتأثرة

```text
Migration SQL جديد:
  - trigger لتحديث current_balance عند إنشاء/تعديل/حذف فاتورة
  - إصلاح reverse_payment_on_delete (+ بدلاً من -)
  - إعادة حساب أرصدة العملاء الحالية (one-time fix)

تعديل Edge Function:
  supabase/functions/process-payment/index.ts
    — استخدام SQL increment بدلاً من read-then-write

تعديل Frontend (3 ملفات):
  src/lib/services/customerService.ts
    — إضافة totalOutstanding إلى CustomerHealthMetrics
  src/hooks/customers/useCustomerDetail.ts
    — تمرير totalOutstanding
  src/components/customers/CustomerStatsGrid.tsx
    — استبدال CLV بـ "المستحق" أو إضافته
  src/components/customers/tabs/CustomerTabInvoices.tsx
    — إضافة تنبيه "دفعات غير مرتبطة" عند وجود فرق
```

---

## 4. ملخص التضارب والإصلاح

| الرقم | المصدر الحالي | المشكلة | الإصلاح |
|---|---|---|---|
| الرصيد الحالي | `customer.current_balance` | لا يُزاد عند الفواتير | trigger على invoices |
| إجمالي المشتريات | `SUM(invoices.total_amount)` | صحيح ✅ | — |
| إجمالي المدفوعات (StatsGrid) | `SUM(payments.amount)` | صحيح ✅ | — |
| المدفوع (Tab Invoices) | `SUM(invoice.paid_amount)` | يختلف عن payments table | توضيح + تنبيه |
| المتبقي (Tab Invoices) | `total - paid_amount` | لا يشمل دفعات بدون فاتورة | تنبيه |
| المستحق | **غير موجود!** | لا يُعرض كرقم مستقل | إضافة للـ StatsGrid |
| حذف دفعة | `current_balance - amount` | اتجاه خاطئ! | `+ amount` |
| Race condition | read-then-write | فقدان بيانات | SQL increment |

