# خطة المرحلة 6 — تحسينات إضافية بعد التدقيق الشامل (مايو 2026)

## ✅ ما تم إنجازه حتى الآن

### الأمان (P0)
- [x] `REVOKE EXECUTE` من `anon`/`public` لجميع دوال SECURITY DEFINER (الـ 23 تنبيه الحرج زالت).
- [x] إضافة `SET search_path = public` لدوال triggers.
- [x] استبدال `error.message` بـ `getSafeErrorMessage()` في `RestoreBackupDialog.tsx`.
- [x] **النتيجة**: 81 تنبيه → 58 (كلها false-positive: دوال RPC مفترض أن يستدعيها `authenticated`).

### الأداء (P1)
- [x] `src/lib/queryConfig.ts` — presets موحدة (`realtime`, `operational`, `standard`, `reference`, `report`).
- [x] `QueryClient` ذكي يتجاهل أخطاء `401/403/42501` في الـ retry.
- [x] preconnect إلى Supabase + Google Fonts موجود في `index.html`.
- [x] `vite.config.ts` يستخدم `manualChunks` ذكية (vendor-react/query/supabase/charts/pdf/excel + 7 page groups).

### الموبايل و UX (P1)
- [x] `usePullToRefresh` hook موحد (curve طبيعي + progress).
- [x] `PullToRefresh` component مفعّل في `CustomersPage`, `InvoicesPage`, `ProductsPage`.
- [x] **`ResponsiveDialog` جديد** — يستخدم `Drawer` على الموبايل و `Dialog` على الديسكتوب.
  - يمكن لأي Dialog كبير الانتقال إليه باستبدال الاستيرادات فقط.

---

## 🔍 تحليل التنبيهات المتبقية (58)

كلها من نوع `0029_authenticated_security_definer_function_executable`:
> **Signed-In Users Can Execute SECURITY DEFINER Function**

هذه التنبيهات **متوقعة في معماريّتنا**:
- جميعها دوال RPC مصممة ليستدعيها المستخدمون المسجلون (`atomic_customer_balance_update`, `convert_quote_to_order`, `get_customer_aging`, ...).
- كل دالة تحتوي **فحوصات تفويض داخلية** عبر `tenant_id` و `has_role`.
- استخدامها بـ `SECURITY DEFINER` ضروري لتجاوز RLS بشكل مُتحكَّم به (مثل تحديث `customer.balance` من trigger).

**القرار**: قبول هذه التنبيهات كـ false-positives موثّقة.

---

## 📋 المهام المُقترحة للجلسات القادمة

### Phase 6A — Mobile UX إضافي (يوم)
1. اعتماد `ResponsiveDialog` في:
   - `CreditNoteFormDialog.tsx` (473 سطر)
   - `InvoiceFormDialog.tsx`
   - `QuotationFormDialog.tsx`
   - `CustomerReminderDialog.tsx`
2. توحيد `EmptyState` عبر مكون `<UnifiedEmptyState>`.
3. فحص touch targets ≥ 44px على كل الأزرار.

### Phase 6B — جودة الكود (يومان)
1. تقسيم `RestoreBackupDialog.tsx` (1213 سطر) إلى:
   - `RestoreConfigStep.tsx`, `RestoreReviewStep.tsx`, `RestoreResultsStep.tsx`
   - `useRestoreBackup.ts` (state machine)
2. استبدال `: any` في أعلى 10 ملفات استخداماً.

### Phase 6C — البنية التحتية (يوم)
1. WCAG AA contrast audit للـ dark mode.
2. `Sentry` أو equivalent للـ error tracking الخارجي.
3. CI workflow لتشغيل Vitest + Playwright تلقائياً.

---

## 📊 المخرجات الحالية

| المحور | البداية | الآن |
|---|---|---|
| Supabase Linter Warnings | 81 | 58 (مقبولة موثقة) |
| Critical RLS Issues | 6 | 0 |
| دوال DEFINER قابلة لـ anon | ~70 | 0 |
| Pull-to-Refresh على القوائم الرئيسية | 0/3 | 3/3 ✅ |
| ResponsiveDialog جاهز | لا | نعم ✅ |
| Query Presets موحدة | لا | نعم ✅ |
