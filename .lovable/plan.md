

# إكمال البيانات التجريبية — الأجزاء الناقصة

## التحليل: ما الذي ينقص فعلاً؟

```text
الجدول                 الحالة              المطلوب
─────────────────     ──────────────      ──────────
suppliers (27)         balance=0, لا       تحديث أرصدة + محافظات + تصنيفات
                       governorate
supplier_notes (0)     فارغ               +5 ملاحظات مربوطة بموردين حقيقيين
tasks (0)              فارغ               +8 مهام متنوعة (مكتملة/قيد التنفيذ)
profiles (2)           فقط مستخدمان       لا يمكن إضافة بدون auth.users ⚠️
custom_roles (6)       ✅ كافي            —
notifications (5)      ✅ مدرجة           —
customer_comms (5)     ✅ مدرجة           —
```

### ملاحظة مهمة عن المستخدمين
إضافة profiles جديدة تتطلب إنشاء مستخدمين في `auth.users` أولاً — وهذا لا يمكن عبر INSERT مباشر. البديل: **إنشاء Edge Function** لتسجيل 3 مستخدمين تجريبيين عبر `supabase.auth.admin.createUser()` مع أدوار مختلفة (sales, accountant, warehouse).

## خطة التنفيذ

### 1. تحديث بيانات الموردين الموجودين (27 مورد)
- تحديث أرصدة `current_balance` لـ 10 موردين (مبالغ متفاوتة: 5000-75000)
- إضافة `governorate` + `city` لـ 15 مورد
- إضافة `credit_limit` + `payment_terms_days` + `discount_percentage`
- إضافة `rating` (1-5) لـ 10 موردين
- تعطيل 2 موردين (`is_active = false`)
- أداة: **insert tool** (UPDATE statements)

### 2. إضافة ملاحظات الموردين (5 ملاحظات)
- مربوطة بموردين حقيقيين من الـ 27 الموجودين
- `created_by` = المستخدم الأول (admin)
- أداة: **insert tool**

### 3. إضافة مهام (8 مهام)
- 3 مكتملة، 3 قيد التنفيذ، 2 لم تبدأ
- أولويات: high, medium, low
- `assigned_to` + `created_by` = المستخدمان الموجودان
- `due_date`: بعضها في الماضي (متأخرة)، بعضها مستقبلية
- أداة: **insert tool**

### 4. إنشاء 3 مستخدمين تجريبيين عبر Edge Function
- إنشاء Edge Function مؤقتة `create-test-users`
- تُنشئ 3 مستخدمين:
  - `sales@test.com` (دور: sales)
  - `accountant@test.com` (دور: accountant)
  - `warehouse@test.com` (دور: warehouse)
- كل مستخدم يحصل تلقائياً على profile + user_role عبر trigger `handle_new_user`
- بعد الإنشاء: تحديث profiles بأسماء + بيانات إضافية
- أداة: **Edge Function + deploy + curl**

### 5. ربط الموظفين بالمستخدمين الجدد
- تحديث 3 من الموظفين الـ 6 بربطهم بالمستخدمين الجدد (`user_id`)
- أداة: **insert tool**

### الملفات المتأثرة
- `supabase/functions/create-test-users/index.ts` (جديد — مؤقت)
- لا توجد تغييرات على schema (INSERT/UPDATE فقط)

