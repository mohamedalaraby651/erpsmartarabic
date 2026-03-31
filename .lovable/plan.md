

# خارطة طريق التطوير المؤسسي — خطة التنفيذ الشاملة
## Enterprise Upgrade Roadmap — Full Implementation Plan

---

## تحليل الوضع الحالي

بعد فحص الكود بالتفصيل، هذا ما هو **موجود فعلاً** مقابل ما هو **مطلوب**:

| المحور | الوضع الحالي | المطلوب |
|--------|-------------|---------|
| `get_customer_stats` | RPC يمسح الجدول كاملاً | Materialized View + Cron Refresh |
| Zod Validation | في `CustomerFormDialog` فقط | في Repository layer أيضاً |
| Table Virtualization | `VirtualizedTable` موجود لكن `CustomerTableView` لا يستخدمه | تطبيقه على جدول العملاء |
| Activity Log | يحفظ `old_values/new_values` كـ JSONB كامل | عرض الفروقات (Diff) بشكل بشري |
| Smart Alerts | تنبيهات ثابتة (Credit, Overdue) | محرك تقييم ائتماني ديناميكي |
| Statement RPC | موجود ويعمل | مكتمل - لا يحتاج تعديل |
| Aging RPC | موجود ويعمل | مكتمل - لا يحتاج تعديل |

---

## المراحل الأربعة

### المرحلة 1: البنية التحتية وقواعد البيانات
**الجهد المقدر: متوسط | الأثر: عالي جداً**

**1.1 — Materialized View لإحصائيات العملاء**
- إنشاء `customer_stats_mv` كـ Materialized View يحسب: العدد الكلي، الأنواع، VIP، الأرصدة
- إنشاء Cron Job عبر `pg_cron` يُحدث الـ View كل 5 دقائق (`REFRESH MATERIALIZED VIEW CONCURRENTLY`)
- تعديل `get_customer_stats()` RPC ليقرأ من الـ View بدلاً من مسح الجدول
- إضافة `UNIQUE INDEX` على الـ View لدعم `CONCURRENTLY`

**1.2 — أتمتة التصدير عبر Edge Function**
- إنشاء Edge Function `export-customers` تولد CSV/Excel في الخلفية
- رفع الملف إلى `documents` Storage Bucket
- إرجاع رابط التحميل للمستخدم
- تحرير متصفح المستخدم من عملية التصدير الثقيلة

---

### المرحلة 2: هندسة الواجهات والأداء
**الجهد المقدر: متوسط | الأثر: عالي**

**2.1 — Zod في Repository Layer**
- إنشاء `customerWriteSchema` في `validations.ts` (مُبسط من `customerSchema`)
- تطبيقه في `customerRepository.create()` و `customerRepository.update()` قبل إرسال البيانات
- ضمان End-to-End Type Safety: Form → Service → Repository → DB

**2.2 — Virtualization لجدول العملاء**
- تعديل `CustomerTableView.tsx` لاستخدام `VirtualizedTable` المكون الموجود فعلاً
- الحفاظ على Selection, Sorting, Keyboard Navigation
- تقليل DOM Nodes من مئات الصفوف إلى ~20 مرئية

---

### المرحلة 3: الدقة المالية وذكاء الأعمال
**الجهد المقدر: عالي | الأثر: حرج**

**3.1 — محرك تقييم المخاطر الائتمانية (Health Score)**
- إنشاء RPC `get_customer_health_score` يحسب:
  - نسبة استخدام الائتمان (30% وزن)
  - DSO مقارنة بشروط الدفع (30% وزن)
  - نسبة الديون المتأخرة >90 يوم (40% وزن)
- النتيجة: درجة 0-100 + تصنيف (Excellent / Good / Warning / Critical)
- تعديل `CustomerSmartAlerts` لعرض التقييم وتوصيات آلية (مثل: "يُنصح بالتحويل لنقدي فقط")

**3.2 — تحسين عرض KPIs**
- دمج Health Score في `CustomerKPICards` و `CustomerFinancialSummary`
- إضافة مؤشر بصري ملون (أخضر/أصفر/أحمر) بجانب اسم العميل

---

### المرحلة 4: تجربة المستخدم المتقدمة
**الجهد المقدر: متوسط | الأثر: متوسط-عالي**

**4.1 — سجل النشاط الذكي (Diff-Based)**
- إنشاء مكون `ActivityDiffViewer` يقرأ `old_values` و `new_values` من `activity_logs`
- يعرض التغييرات بشكل بشري: "تغيير حد الائتمان: 10,000 ← 15,000"
- خريطة ترجمة لأسماء الحقول (field_name → اسم عربي)
- تطبيقه في `CustomerTabActivity`

**4.2 — Sales Pipeline المصغر**
- إنشاء مكون `CustomerSalesPipeline` يعرض:
  - عروض أسعار مفتوحة → أوامر بيع نشطة → فواتير معلقة
  - بصرياً كـ Flow/Funnel مبسط
- دمجه في التبويب المالي (Financial) كعرض سريع بدلاً من التنقل بين 3 تبويبات

---

## ملخص التأثير

```text
┌─────────────────────────┬────────┬──────────┐
│ التحسين                 │ الجهد  │ الأثر    │
├─────────────────────────┼────────┼──────────┤
│ Materialized View       │ منخفض  │ عالي جداً │
│ Export Edge Function    │ متوسط  │ عالي     │
│ Zod في Repository      │ منخفض  │ متوسط   │
│ Table Virtualization    │ منخفض  │ عالي     │
│ Health Score Engine     │ متوسط  │ حرج     │
│ Activity Diff Viewer    │ متوسط  │ متوسط   │
│ Sales Pipeline Widget   │ متوسط  │ متوسط   │
└─────────────────────────┴────────┴──────────┘
```

## ملاحظات هندسية

- **PostGIS**: ميزة مستقبلية ممتازة لكنها تحتاج بيانات إحداثيات العملاء أولاً — يُفضل تأجيلها لمرحلة لاحقة بعد جمع البيانات
- **Offline-First (PersistQueryClient)**: البنية التحتية لـ PWA موجودة فعلاً — التطبيق الفعلي يحتاج اختبارات ميدانية مكثفة ويُفضل كمشروع منفصل
- **WhatsApp Business API**: يحتاج حساب Meta Business وتكامل خارجي — مشروع مستقل

