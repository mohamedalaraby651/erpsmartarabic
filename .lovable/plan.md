# 📋 خطة الفحص الشامل والإصلاح للمشروع

## 🎯 الهدف
فحص شامل عميق للنظام بأكمله عبر **10 محاور**، إنتاج تقرير عربي مفصّل، وإصلاح المشاكل الحرجة (P0) فوراً عند اكتشافها.

---

## ⚠️ تنبيهات أولية (من Console logs)
- **FCP/LCP = 129 ثانية** — كارثي (الحد الموصى به: < 2.5s)
- **CLS = 2.76** — استقرار بصري سيء جداً (الحد: < 0.1)
- يستوجب فحصاً عاجلاً للأداء (Bundle، lazy loading، blocking scripts)

---

## 🔬 المحاور الـ 10 للفحص

### **المحور 1: 🔐 الأمان (P0)**
- `security--run_security_scan` — رصد ثغرات RLS
- `supabase--linter` — مشاكل DB
- فحص Storage Hybrid Model (logos public + باقي private tenant-scoped)
- فحص XSS/Injection: `dangerouslySetInnerHTML`, `innerHTML`, `eval`
- فحص hardcoded secrets
- التحقق من فعالية PII Masking views

### **المحور 2: 💾 قاعدة البيانات (P0)**
- جداول بدون RLS أو `tenant_id`
- Foreign keys مفقودة + indexes ناقصة
- Orphan records (بيانات يتيمة)
- توازن دفتر الأستاذ (Debit = Credit)
- الفترات المالية المفتوحة 2026
- `domain_events` backlog
- اكتمال `posting_account_map` لكل tenant
- صحة Materialized Views

### **المحور 3: ⚡ الأداء (P0/P1)**
- قياس Bundle size الفعلي + main chunk
- التحقق من lazy-loading لـ 36 صفحة
- N+1 queries في 65 hook
- React Query staleTime/gcTime
- صور: lazy + WebP + sizing
- jsPDF lazy loading
- Virtual scrolling للقوائم
- Web Vitals عبر `browser--performance_profile`
- CPU profiling لـ long tasks

### **المحور 4: 🧩 جودة الكود (P1)**
- `any` types، `console.log`، `error.message` exposed
- ملفات > 400 سطر (5 ملفات حالياً)
- Circular dependencies
- Dead code (unused imports/exports/files)
- ESLint warnings/errors
- TypeScript strict compliance

### **المحور 5: 🎨 واجهة المستخدم (P1)**
- HSL semantic tokens vs hardcoded colors
- RTL compliance في كل الصفحات
- Accessibility (ARIA, alt, keyboard)
- Mobile touch targets (44px+)
- Empty states
- Loading skeletons
- Error boundaries
- رسائل validation عربية

### **المحور 6: 🔗 الروابط والتنقل (P1)**
- Broken routes (روابط بدون صفحات)
- Dead routes (صفحات بدون روابط)
- Auth guards
- Permission-based routing
- Sidebar consistency
- Deep linking
- 404 handling

### **المحور 7: 🎬 الإجراءات والأزرار (P1)**
- أزرار بدون onClick
- Confirm dialogs للعمليات الحساسة
- Loading states أثناء mutations
- Optimistic updates
- Toast notifications
- Form errors
- Disabled states منطقية

### **المحور 8: 🧪 الاختبارات (P2)**
- تشغيل 39 unit/integration test
- تشغيل 13 e2e Playwright
- قياس coverage
- ميزات بدون اختبار
- Edge function tests (Deno)

### **المحور 9: 📦 المكتبات (P2)**
- نقل testing deps إلى devDependencies
- Outdated packages
- Duplicate deps
- Bundle impact لكل مكتبة ثقيلة
- Security advisories

### **المحور 10: 🏗️ البنية والمعمارية (P2)**
- اتساق نمط المجلدات
- Separation of concerns
- Repositories vs direct supabase calls
- Error handling موحد (`getSafeErrorMessage`)
- Service Worker و PWA
- Offline functionality
- Multi-tenant isolation فعلي

---

## 🛠️ الأدوات المستخدمة
| الأداة | الغرض |
|--------|-------|
| `security--run_security_scan` | ثغرات RLS و PII |
| `supabase--linter` | فحص DB |
| `supabase--read_query` | استعلامات تحقق (orphans, balance) |
| `supabase--analytics_query` | logs أخطاء (DB, Auth, Edge) |
| `supabase--edge_function_logs` | فشل 10 edge functions |
| `code--exec` (rg, find, wc) | فحص ثابت للكود |
| `browser--performance_profile` | قياس أداء فعلي |
| `browser--start_profiling` + `stop_profiling` | تحديد long tasks |
| `lsp--code_intelligence` | references و dead code |

---

## 🚦 منهجية التنفيذ (3 مراحل)

### **المرحلة A — الفحص العميق (Read-Only)**
1. جلسة 1: الأمان + DB + Edge logs
2. جلسة 2: الأداء (Browser profiling + Bundle analysis)
3. جلسة 3: الكود + UI + Routes + Architecture (rg/find static analysis)
4. جلسة 4: تشغيل الاختبارات الموجودة (vitest + playwright)

### **المرحلة B — الإصلاح الفوري (P0)**
- إصلاح ثغرات RLS الحرجة
- إصلاح مشاكل توازن دفتر الأستاذ (إن وُجدت)
- إصلاح أعطال Edge Functions
- إصلاح أداء كارثي (FCP/LCP/CLS) — قد يتطلب:
  - تحويل imports ثقيلة إلى dynamic
  - إصلاح blocking scripts
  - إضافة preconnect/prefetch
  - إصلاح layout shifts (تثبيت أبعاد العناصر)

### **المرحلة C — التقرير النهائي**
إنشاء **`docs/COMPREHENSIVE_AUDIT_REPORT_2026.md`** يتضمن:
1. ملخص تنفيذي عربي
2. جدول مصنّف بالأولويات (P0/P1/P2) + الجهد التقديري
3. تفاصيل كل مشكلة + موقعها + الحل المقترح
4. مقاييس Before/After (للأداء والأمان)
5. خطة Phase 6+ المقترحة للإصلاحات المتبقية (P1, P2)
6. Heatmap للملفات الأكثر مشكلات

---

## 📦 المخرجات النهائية

| الملف | الوصف |
|-------|-------|
| `docs/COMPREHENSIVE_AUDIT_REPORT_2026.md` | التقرير العربي المفصل |
| Migrations جديدة | إصلاح P0 (RLS، triggers، indexes) |
| Code edits | إصلاح أداء حرج (lazy imports، CLS fixes) |

---

## ⏱️ الوقت المتوقع
- المرحلة A (فحص): ~15-20 دقيقة
- المرحلة B (إصلاحات P0): متغيّر حسب ما يُكتشف
- المرحلة C (تقرير): ~5 دقائق

**الإجمالي: 30-45 دقيقة**

---

## ❓ نقاط القرار أثناء التنفيذ
- إذا اكتُشفت **أكثر من 5 مشاكل P0**: سأتوقف لأعرضها قبل الإصلاح الجماعي
- إذا تطلّب إصلاح الأداء **تغيير معماري كبير**: سأطلب موافقة منفصلة
- إذا فشلت اختبارات **حرجة**: سأبلغ فوراً قبل المتابعة

---

**الموافقة تتيح لي البدء في وضع التنفيذ الفوري.**
