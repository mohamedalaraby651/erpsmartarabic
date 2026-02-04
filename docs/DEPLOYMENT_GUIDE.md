# دليل النشر (Deployment Guide)

## نظرة عامة

هذا الدليل يشرح كيفية نشر النظام على بيئة الإنتاج باستخدام Lovable Cloud.

---

## متطلبات النظام

### البيئة التطويرية
- Node.js 18+
- Bun (مدير الحزم)
- متصفح حديث (Chrome, Firefox, Safari, Edge)

### البيئة الإنتاجية
- Lovable Cloud (يتضمن Supabase)
- HTTPS (مُوفّر تلقائياً)

---

## إعداد البيئة

### 1. المتغيرات البيئية

الملف `.env` يُنشأ تلقائياً ويحتوي:

```env
VITE_SUPABASE_URL=https://[project-id].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_SUPABASE_PROJECT_ID=[project-id]
```

> ⚠️ **لا تعدّل هذا الملف يدوياً** - يُدار تلقائياً بواسطة Lovable Cloud

### 2. Edge Functions

تُنشر تلقائياً عند الحفظ:

| الوظيفة | المسار | الوصف |
|---------|--------|-------|
| `validate-invoice` | `/functions/v1/validate-invoice` | التحقق من الفواتير |
| `process-payment` | `/functions/v1/process-payment` | معالجة الدفعات |
| `approve-expense` | `/functions/v1/approve-expense` | الموافقة على المصروفات |
| `stock-movement` | `/functions/v1/stock-movement` | حركات المخزون |
| `approve-invoice` | `/functions/v1/approve-invoice` | الموافقة على الفواتير |
| `create-journal` | `/functions/v1/create-journal` | إنشاء القيود المحاسبية |
| `verify-totp` | `/functions/v1/verify-totp` | المصادقة الثنائية |

---

## النشر للإنتاج

### الخطوات

1. **التحقق من الاختبارات**
   ```bash
   npm run test
   ```
   يجب أن تنجح جميع الاختبارات (850+)

2. **التحقق من TypeScript**
   ```bash
   npm run typecheck
   ```
   لا يجب أن تكون هناك أخطاء

3. **البناء المحلي (اختياري)**
   ```bash
   npm run build
   ```

4. **النشر**
   - اضغط على زر **"Publish"** في واجهة Lovable
   - أو من القائمة: **Settings → Publish**

### بعد النشر

- الرابط الإنتاجي: `https://[project-name].lovable.app`
- يمكن ربط نطاق مخصص من الإعدادات

---

## قائمة التحقق قبل النشر

### الأمان ✅

- [ ] RLS مفعّل على جميع الجداول الحساسة
- [ ] Edge Functions تعمل بشكل صحيح
- [ ] لا يوجد `console.log` أو `console.error` في الكود الإنتاجي
- [ ] لا يتم كشف `error.message` للمستخدم (يستخدم `getSafeErrorMessage`)
- [ ] Audit Triggers مفعّلة على الجداول الحرجة

### الأداء ✅

- [ ] Virtual Scrolling مفعّل للقوائم الطويلة
- [ ] الصور محسّنة (lazy loading)
- [ ] المكونات مُحسّنة بـ `memo` حيث مطلوب

### الوظائف ✅

- [ ] تسجيل الدخول والخروج يعمل
- [ ] الصلاحيات تعمل بشكل صحيح
- [ ] الإشعارات تعمل
- [ ] PWA يعمل (offline, install)

### التوثيق ✅

- [ ] API_DOCUMENTATION.md محدّث
- [ ] DATABASE_SCHEMA.md محدّث
- [ ] PROJECT_PROGRESS.md محدّث

---

## النسخ الاحتياطي والاسترداد

### النسخ الاحتياطي

1. افتح **Cloud View** في Lovable
2. انتقل إلى **Database → Backup**
3. اضغط **Create Backup**

> النسخ الاحتياطي التلقائي يعمل يومياً

### الاسترداد

1. افتح **Cloud View** في Lovable
2. انتقل إلى **Database → Restore**
3. اختر النسخة المطلوبة
4. اضغط **Restore**

> ⚠️ الاسترداد يحل محل البيانات الحالية

---

## المراقبة والصيانة

### مراقبة الأداء

- **Cloud View → Analytics**: إحصائيات الاستخدام
- **Cloud View → Logs**: سجلات الأخطاء والطلبات

### سجلات Edge Functions

```sql
-- استعلام سجلات Edge Functions
SELECT * FROM function_edge_logs
ORDER BY timestamp DESC
LIMIT 100;
```

### سجلات قاعدة البيانات

```sql
-- استعلام سجلات PostgreSQL
SELECT * FROM postgres_logs
ORDER BY timestamp DESC
LIMIT 100;
```

---

## استكشاف الأخطاء

### مشاكل شائعة

#### 1. خطأ RLS
**المشكلة:** `new row violates row-level security policy`

**الحل:**
- تأكد من وجود `user_id` في البيانات المُرسلة
- تأكد من أن المستخدم مسجّل الدخول

#### 2. Edge Function لا تعمل
**المشكلة:** `Function not found` أو `500 error`

**الحل:**
1. تحقق من وجود الملف في `supabase/functions/[name]/index.ts`
2. تحقق من سجلات Edge Functions
3. أعد نشر الوظيفة

#### 3. الصور لا تظهر
**المشكلة:** صور Storage لا تُحمّل

**الحل:**
- تحقق من RLS على `storage.objects`
- تحقق من صلاحيات الـ bucket

---

## التحديثات

### تحديث الكود

1. أجرِ التعديلات في Lovable
2. اختبر في Preview
3. اضغط **Publish**

### تحديث قاعدة البيانات (Migrations)

1. استخدم أداة Migration في Lovable
2. اكتب SQL للتغييرات
3. اضغط **Apply Migration**

> ⚠️ دائماً خذ نسخة احتياطية قبل تشغيل migrations

---

## الموارد

- [توثيق Lovable](https://docs.lovable.dev)
- [توثيق Supabase](https://supabase.com/docs)
- [API Documentation](./API_DOCUMENTATION.md)
- [Database Schema](./DATABASE_SCHEMA.md)

---

## الدعم

للمساعدة التقنية:
1. راجع [الأسئلة الشائعة](https://docs.lovable.dev/faq)
2. تواصل مع فريق الدعم عبر Lovable
