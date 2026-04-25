
# 📋 خطة المشروع الشاملة — نظام Nazra ERP
> **تاريخ:** 2026-04-25 | **الإصدار:** 2.0 | **المدة الكلية:** 16 أسبوعاً (4 أشهر)
> **التقييم الحالي:** 8.2/10 → **المستهدف:** 9.5/10
> **الحجم:** 103,032 سطر | 99 جدول | 12 Edge Function | 36 صفحة | 64 مكون | 65 hook

---

## 🎯 الخلاصة التنفيذية

بناءً على الفحص الأمني والتدقيق الفني، النظام **متين معمارياً** لكنه يعاني من:
- **3 ثغرات حرجة (P0)** تكسر عزل المستأجرين
- **3 تحذيرات أمنية (P1)** متعلقة بالتخزين والـ Edge Functions
- **نواقص وظيفية** في الفوترة الإلكترونية المصرية، نقاط البيع، والعملات المتعددة
- **ديون تقنية** في 4 ملفات تتجاوز 700 سطر، و 99 ملف migration متراكم

---

## 🔴 المرحلة 0 — الإصلاحات الأمنية الحرجة (الأسبوع 1)
> **الهدف:** إغلاق كل الثغرات الحرجة قبل أي تطوير جديد

### A. إصلاح تسريب البيانات بين المستأجرين (Cross-Tenant Leak)
**المشكلة:** 12 جدول لديها سياسات RLS مكررة تتجاوز عزل `tenant_id`:
| الجدول | السياسة المخالفة |
|--------|------------------|
| `chart_of_accounts` | `chart_of_accounts_manage` |
| `journals` | `journals_select/insert/update/delete` |
| `journal_entries` | `journal_entries_select/insert/update/delete` |
| `bank_accounts` | `bank_accounts_manage_policy`, `bank_accounts_select_policy` |
| `cash_registers` | `cash_registers_manage_policy` |
| `expense_categories` | `expense_categories_manage_policy` |
| `supplier_payments` | `Admin or accountant can manage supplier payments` |
| `warehouses` | `Admin or warehouse can manage warehouses` |
| `fiscal_periods` | `fiscal_periods_manage`, `fiscal_periods_select` |
| `product_categories` | `product_categories_manage_policy` |
| `product_variants` | `Admin or warehouse can manage variants` |
| `purchase_order_items` | `Admin or warehouse can manage purchase order items` |

**الحل:** Migration واحدة تحذف كل السياسات التي تفتقد `tenant_id = get_current_tenant()`.

### B. إصلاح `expenses_insert_policy`
**المشكلة:** `auth.uid() IS NOT NULL` فقط — يسمح لأي مستخدم بإدراج مصروفات لأي مستأجر.
**الحل:** حذف السياسة المتساهلة والإبقاء على `Tenant users can create expenses`.

### C. إضافة `tenant_id` لـ `supplier_notes`
**المشكلة:** الجدول لا يحتوي على `tenant_id` — تسريب كامل عبر المستأجرين.
**الحل:** Migration:
```sql
ALTER TABLE supplier_notes ADD COLUMN tenant_id UUID 
  DEFAULT get_current_tenant() NOT NULL;
UPDATE supplier_notes sn SET tenant_id = s.tenant_id 
  FROM suppliers s WHERE sn.supplier_id = s.id;
-- ثم إعادة كتابة كل السياسات
```

### D. تعزيز `check_financial_limit` بفلتر المستأجر
أضف `AND tenant_id = get_current_tenant()` داخل الدالة.

**الناتج:** ✅ صفر ثغرات حرجة في فحص الأمان.

---

## 🟠 المرحلة 1 — تأمين البنية التحتية (الأسبوع 2)

### A. خصخصة دلاء التخزين (Storage Buckets)
| Bucket | الحالة الحالية | الحل |
|--------|---------------|------|
| `avatars` | عام 🔴 | خاص + `createSignedUrl(3600)` |
| `logos` | عام 🔴 | خاص + روابط موقعة |
| `customer-images` | عام 🔴 | خاص + روابط موقعة |
| `supplier-images` | عام 🔴 | خاص + روابط موقعة |
| `employee-images` | عام 🔴 (الأخطر — صور موظفين) | خاص فوراً |

ثم استبدال `getPublicUrl()` بـ `createSignedUrl()` في كل الأكواد.

### B. تأمين `event-dispatcher` Edge Function
**المشكلة:** يقبل أي طلب غير موثّق ويستخدم Service Role Key.
**الحل:**
```typescript
const secret = req.headers.get('x-dispatcher-secret');
if (secret !== Deno.env.get('DISPATCHER_SECRET')) {
  return new Response('Unauthorized', { status: 401 });
}
```
+ إضافة `DISPATCHER_SECRET` كـ Edge Function Secret + تحديث جدولة pg_cron.

### C. إخفاء أخطاء قاعدة البيانات في Edge Functions
4 وظائف تكشف رسائل PostgreSQL الخام: `create-journal`, `approve-expense`, `process-payment`, `stock-movement`.
**الحل:** نمط موحد — log داخلياً، وإرجاع `{ error: 'Internal server error', code: 'INTERNAL_ERROR' }` للمستخدم.

---

## 🟡 المرحلة 2 — جودة الكود والتنظيف (الأسبوع 3)

### A. تقليل ملفات > 500 سطر
| الملف | الأسطر | خطة التقسيم |
|-------|--------|-------------|
| `RestoreBackupDialog.tsx` | 1,213 | 4 خطوات: `RestoreSetupStep`, `RestoreReviewStep`, `RestoreProgressStep`, `RestoreResultsStep` |
| `ReportTemplateEditor.tsx` | 736 | استخراج `TemplateFieldList`, `TemplatePreview`, `TemplateSettings` |
| `sidebar.tsx` (shadcn) | 637 | ⚠️ مكتبة — لا تُلمس |
| `PurchaseOrdersPage.tsx` | 498 | استخراج `PurchaseOrderTable`, `PurchaseOrderFilters` |

### B. إزالة `any` من الملفات الحرجة
- `src/lib/offlineStorage.ts` (13 موضع)
- `src/hooks/useUserPreferences.ts`, `ExportWithTemplateButton.tsx`, `useTableFilter.ts`

### C. تنظيف `console.log` في Production
معظمها داخل `import.meta.env.DEV` — لكن نُغلف الكل بمساعدة `lib/logger.ts` موحدة.

### D. توحيد معالجة الأخطاء
استبدال كل `error.message` المكشوف بـ `getSafeErrorMessage()` (10 ملفات متبقية).

### E. ضغط Migrations
99 migration → دمج التاريخية في snapshot واحد + الإبقاء على آخر 30 يوماً للسجل.

---

## 🟢 المرحلة 3 — إكمال النواقص الوظيفية (الأسابيع 4-7)

### الأسبوع 4: الفواتير والمبيعات
- [ ] **Credit Note** (فاتورة مرتجع) كاملة مع قيود محاسبية تلقائية
- [ ] **Duplicate Invoice** (نسخ فاتورة) بنقرة واحدة
- [ ] **طباعة دفعية** لعدة فواتير بـ PDF واحد
- [ ] ربط الفاتورة تلقائياً بـ `stock_movements`
- [ ] تذكيرات استحقاق آلية عبر `event-dispatcher`

### الأسبوع 5: العملاء والموردين
- [ ] **كشف حساب** PDF كامل (Statement of Account)
- [ ] استيراد عملاء من Excel مع كشف المكررات
- [ ] دمج سجلات العملاء المكررة (Merge Duplicates)
- [ ] **مقارنة أسعار الموردين** لنفس المنتج
- [ ] طلب عرض سعر (RFQ) من عدة موردين

### الأسبوع 6: المخزون والمنتجات
- [ ] **Stock Take** (جرد دوري) مع كشف الفروقات
- [ ] تحويل بين المستودعات بنموذج مبسط
- [ ] **تسعير متعدد** (جملة، تجزئة، موزع، VIP)
- [ ] حد أدنى/أقصى للمخزون مع تنبيهات Nazra
- [ ] عرض Grid View بصور المنتجات

### الأسبوع 7: المحاسبة المالية
- [ ] **الميزانية العمومية** (Balance Sheet)
- [ ] **قائمة التدفقات النقدية** (Cash Flow Statement)
- [ ] **تسوية بنكية** (Bank Reconciliation) شبه آلية
- [ ] **إقفال الفترة** (Period Closing) مع قيود الإقفال

---

## 🔵 المرحلة 4 — تطوير سوقي استراتيجي (الأسابيع 8-11)

### الأسبوع 8-9: الفوترة الإلكترونية المصرية (E-Invoicing)
- [ ] تكامل مع منصة الضرائب المصرية (Egyptian Tax Authority)
- [ ] إصدار فواتير بصيغة JSON المعتمدة
- [ ] التوقيع الرقمي (e-Signature)
- [ ] متابعة حالة الإرسال (Submitted/Cleared/Rejected)
- [ ] أرشفة استجابات ETA

### الأسبوع 10: نقطة البيع (POS)
- [ ] واجهة POS سريعة لأجهزة اللمس
- [ ] دعم Barcode Scanner و Cash Drawer
- [ ] جلسات الكاشير (Open/Close Shift)
- [ ] طباعة فاتورة حرارية (58mm/80mm)
- [ ] العمل offline-first مع مزامنة لاحقة

### الأسبوع 11: العملات المتعددة (Multi-Currency)
- [ ] جدول `currencies` و `exchange_rates`
- [ ] تحديث أسعار الصرف يومياً (API خارجي)
- [ ] فروقات العملة المحققة وغير المحققة
- [ ] تقارير بعملة العرض المختارة

---

## 💎 المرحلة 5 — تجربة المستخدم والصقل (الأسابيع 12-14)

### الأسبوع 12: Onboarding وتحسين القبول
- [ ] **معالج الإعداد الأول** (First-Time Setup Wizard) — 5 خطوات
- [ ] جولة تفاعلية (Product Tour) باستخدام `react-joyride`
- [ ] قوالب جاهزة لقطاعات: تجارة جملة، تجزئة، خدمات، مطاعم
- [ ] استيراد بيانات تجريبية بنقرة واحدة

### الأسبوع 13: تحسينات الأداء وتجربة الموبايل
- [ ] **Virtual Scrolling** للقوائم > 100 صف (`@tanstack/react-virtual`)
- [ ] **Server-side pagination** للفواتير والعملاء والمنتجات
- [ ] ضغط الصور تلقائياً قبل الرفع (`browser-image-compression`)
- [ ] Critical CSS inline لتسريع First Paint
- [ ] PWA: Web Push notifications للتذكيرات

### الأسبوع 14: ذكاء Nazra v2
- [ ] توقع المبيعات (Sales Forecasting) بناءً على التاريخ
- [ ] اقتراح إعادة الطلب (Reorder Suggestions) ذكي
- [ ] كشف الشذوذ في المصروفات (Anomaly Detection)
- [ ] ملخص يومي بالذكاء الاصطناعي عبر Lovable AI Gateway
- [ ] لوحة "أهم 10 إجراءات اليوم"

---

## 📚 المرحلة 6 — التوثيق والاختبارات (الأسابيع 15-16)

### الأسبوع 15: التوثيق
**النواقص الموجودة:**
- ❌ لا يوجد دليل مستخدم نهائي (User Guide) بالعربية
- ❌ لا يوجد فيديوهات تعليمية
- ❌ `API_DOCUMENTATION.md` قديم
- ❌ لا يوجد `CONTRIBUTING.md` للمطورين
- ❌ لا يوجد `CHANGELOG.md` منظم

**العمل:**
- [ ] دليل مستخدم تفاعلي داخل التطبيق (`/help`)
- [ ] تحديث `API_DOCUMENTATION.md` مع كل RPC و Edge Function
- [ ] إنشاء `CONTRIBUTING.md` و `CHANGELOG.md`
- [ ] توثيق RLS Policies في `docs/SECURITY_POLICIES.md`
- [ ] رسوم Mermaid للأنظمة الفرعية

### الأسبوع 16: الاختبارات والإطلاق
- [ ] رفع تغطية الاختبارات من ~40% إلى 70%+
- [ ] E2E tests للسيناريوهات الحرجة (Playwright)
- [ ] Load testing لـ Edge Functions
- [ ] Security audit نهائي
- [ ] إصدار v2.0.0 رسمي

---

## ⚠️ التحديات الرئيسية والمخاطر

| التحدي | الاحتمال | الأثر | خطة التخفيف |
|--------|---------|------|--------------|
| ETA E-Invoicing API معقد ومتغير | عالي | عالي | ابدأ بـ Sandbox + استشاري ضرائب |
| تعطيل عملاء عند نشر إصلاحات RLS | متوسط | عالي | نشر في نافذة صيانة + اختبار شامل |
| Multi-Currency يكسر التقارير الحالية | متوسط | عالي | Feature flag + ترحيل تدريجي |
| ضغط Migrations يفقد سجل التاريخ | منخفض | متوسط | نسخة احتياطية كاملة قبل الدمج |
| POS offline يخلق تعارضات في المخزون | متوسط | متوسط | Conflict resolution + قفل تفاؤلي |

---

## 📊 جدول الأولويات الموحد

| # | البند | المرحلة | الأسبوع | الجهد | الأثر |
|---|-------|---------|---------|-------|------|
| 1 | إصلاح RLS عبر المستأجرين (12 جدول) | 0 | 1 | 6h | 🔴🔴🔴 |
| 2 | إصلاح `expenses_insert_policy` | 0 | 1 | 30m | 🔴🔴🔴 |
| 3 | إضافة `tenant_id` لـ `supplier_notes` | 0 | 1 | 1h | 🔴🔴🔴 |
| 4 | خصخصة 5 storage buckets | 1 | 2 | 4h | 🔴🔴 |
| 5 | تأمين `event-dispatcher` | 1 | 2 | 1h | 🔴🔴 |
| 6 | إخفاء أخطاء DB في Edge Functions | 1 | 2 | 2h | 🟠 |
| 7 | تقسيم الملفات الكبيرة (3 ملفات) | 2 | 3 | 8h | 🟡 |
| 8 | E-Invoicing مصري | 4 | 8-9 | 60h | 🔵🔵🔵 |
| 9 | POS Module | 4 | 10 | 40h | 🔵🔵🔵 |
| 10 | Multi-Currency | 4 | 11 | 30h | 🔵🔵 |

---

## 🎁 المخرجات النهائية بعد 16 أسبوع

✅ **0 ثغرات أمنية حرجة** (من 3 حالياً)
✅ **0 تحذيرات RLS** (من 4 حالياً)
✅ **تغطية اختبارات 70%+** (من ~40%)
✅ **3 موديولات سوقية جديدة:** ETA, POS, Multi-Currency
✅ **توثيق كامل** (مطور + مستخدم نهائي)
✅ **تجربة Onboarding احترافية** ترفع نسبة التحويل
✅ **Nazra v2** بـ AI insights فعلية
✅ **تقييم 9.5/10** جاهز للسوق المؤسسي

---

## 🚀 ما الذي أبدأ به فوراً عند الموافقة؟

عند موافقتك على الخطة، سأنفذ **المرحلة 0 كاملة في رسالة واحدة:**
1. Migration موحدة تصلح كل سياسات RLS الـ 12
2. Migration لـ `supplier_notes.tenant_id`
3. تحديث `check_financial_limit`
4. اختبار شامل عبر `security--run_security_scan`

هل توافق على البدء بالمرحلة 0 الآن، أم تريد ترتيب الأولويات بشكل مختلف؟
