

# خطة تنفيذ الفجوات الحرجة — Priority 1 + Priority 2

بناءً على مراجعة Post-Implementation Review، هذه المهام المتبقية المسؤولة عن ~50% من جودة التجربة.

---

## Priority 1: فوري (3 مهام)

### 1. تفعيل PageTransition في AppLayout
**ملف:** `src/components/layout/AppLayout.tsx`

المكون `PageTransition` موجود وجاهز لكنه غير مستخدم. التغيير بسيط:
- استيراد `PageTransition` (lazy loaded)
- لف `<Outlet />` بـ `<PageTransition direction="fade" duration="fast">` في كلا الـ mobile و desktop layouts
- إزالة `animate-fade-in` الحالي من الـ `div` المحيط (لتجنب تداخل الأنيميشن)

### 2. إصلاح DataCard — hover → tap
**ملف:** `src/components/mobile/DataCard.tsx`

المشكلة: الأزرار (view/edit/delete) تعتمد على swipe أو long-press فقط — لا يوجد اكتشاف مباشر على الموبايل عند عدم استخدام swipe.

الحل:
- إضافة `useIsMobile()` في DataCard
- على الموبايل: إظهار 1-2 أزرار أساسية (view + edit) دائماً بجانب السهم، بأيقونات صغيرة (بدون نص)
- الحفاظ على swipe actions كما هي (لا تغيير)
- ضمان touch targets بحجم 44px (`min-h-11 min-w-11`)

### 3. توحيد Touch Targets (44px)
**ملفات متعددة:** كل detail pages + action buttons

مراجعة شاملة وإضافة:
- `min-h-[44px] min-w-[44px]` لكل زر تفاعلي على الموبايل
- الملفات المستهدفة: `InvoiceDetailsPage`, `CustomerDetailsPage`, `ProductDetailsPage`, `QuotationDetailsPage`, `SalesOrderDetailsPage`, `PurchaseOrderDetailsPage`, `SupplierDetailsPage`
- التطبيق عبر utility class مشترك أو conditional class باستخدام `isMobile`

---

## Priority 2: أسبوع (3 مهام)

### 4. بناء MobileDetailSection موحد
**ملف جديد:** `src/components/mobile/MobileDetailSection.tsx`

مكون wrapper موحد يستبدل استخدام `Collapsible` بشكل ad-hoc:
```tsx
<MobileDetailSection
  title="النشاط"
  priority="low"        // high=always open, medium=open by default, low=collapsed
  icon={<Activity />}
  badge={3}             // optional count badge
>
  {children}
</MobileDetailSection>
```
- `priority="high"` → لا يمكن إغلاقه
- `priority="medium"` → مفتوح افتراضياً، قابل للإغلاق
- `priority="low"` → مغلق افتراضياً

### 5. تطبيق MobileDetailSection على كل detail pages
استبدال كل استخدام مباشر لـ `Collapsible` في الصفحات الست بالمكون الموحد، مع تحديد priority لكل قسم.

### 6. Reports — Insight-first على الموبايل
**ملف:** `src/pages/reports/ReportsPage.tsx` (680 سطر)

الصفحة تحتوي أصلاً على `MobileSummaryCards` و `MobileTopItemsList` — لكنها chart-first.

التحسينات:
- على الموبايل: إعادة ترتيب المحتوى — KPI cards أولاً ثم Top Items ثم Charts (مصغرة)
- تقليص حجم الرسوم البيانية على الموبايل (height من 300 إلى 200)
- إضافة `MobileStatsScroll` للـ KPIs الرئيسية بدل grid
- Tabs على الموبايل: scrollable horizontally بدل wrap

---

## الملفات المتأثرة

| الملف | نوع التغيير |
|-------|-------------|
| `layout/AppLayout.tsx` | تفعيل PageTransition |
| `mobile/DataCard.tsx` | إظهار أزرار أساسية على الموبايل |
| `mobile/MobileDetailSection.tsx` | **جديد** — section موحد مع priority |
| 7 detail pages | touch targets 44px + MobileDetailSection |
| `reports/ReportsPage.tsx` | Insight-first layout على الموبايل |

---

## النتيجة المتوقعة

| المعيار | الحالي | بعد التنفيذ |
|---------|--------|------------|
| التقارير | 5/10 | 7.5/10 |
| التنقل | 8/10 | 9/10 |
| الاتساق | 8/10 | 9/10 |
| **الإجمالي** | **7.8/10** | **8.6/10** |

