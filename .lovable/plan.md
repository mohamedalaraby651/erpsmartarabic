
# خطة إكمال تطوير صفحة العملاء (المرحلة 2)

تم في المرحلة السابقة: تنظيف الهيدر، إعادة تصميم البطاقة، تحسين الفلاتر، تحسين الأفاتار. هذه الخطة تكمل النقاط المتبقية مع المراجعة والاختبار.

## ما سيتم تنفيذه

### 1. شريط ملخص ذكي قابل للضغط (أولوية عالية)
إضافة شريط `CustomerSummaryBar` فوق القائمة يعرض:
- إجمالي الديون المستحقة (مجموع الأرصدة المدينة)
- عدد العملاء المتأخرين (لديهم فواتير overdue)
- عدد العملاء قرب حد الائتمان (>80%)
- كل بطاقة قابلة للضغط → تفعّل الفلتر المقابل تلقائياً
- يطابق نمط `kpi-value` و `card-premium` من design system
- مخفي عند تفعيل بحث/فلتر (تجنب التشويش)

### 2. Swipe Actions على البطاقة (أولوية عالية)
إنشاء hook `useCustomerSwipeActions`:
- Swipe يسار → كشف زرين: "فاتورة جديدة" + "دفعة" (ألوان primary/success)
- Swipe يمين → "اتصال" + "WhatsApp" (إذا توفر phone)
- threshold = 80px، spring back عند الإفلات
- Haptic feedback عبر `lib/haptics.ts`
- Long-press يبقى يفتح القائمة الكاملة (لا تعارض)
- معطّل تلقائياً على الديسكتوب
- متوافق مع memory `mobile-native-interaction-standards` (44px، tap-only)

### 3. Virtualization للقائمة (أولوية متوسطة)
- استخدام `useVirtualList` الموجود (تحقق من الاستخدام الحالي أولاً)
- تفعيل فقط عند `data.length > 50`
- ارتفاع بطاقة ثابت ≈ 120px (mobile) / 90px (desktop)
- الحفاظ على `IntersectionObserver` للـ infinite scroll
- `useDeferredValue` على نتائج البحث لتقليل re-renders

### 4. تحسين الفرز والترتيب
- إضافة خيارات: "الأكثر تأخراً"، "الأعلى رصيداً مدين"، "VIP أولاً"، "آخر نشاط"
- حفظ آخر sortKey في `useNavigationState` (sessionStorage per-route)
- نقل dropdown الفرز بجوار chip الفلاتر بدل تعليقه منفصلاً

### 5. تحسينات a11y وأداء
- مراجعة جميع الأيقونات-أزرار وإضافة `aria-label` عربي صحيح
- التحقق من 44px touch targets على كل العناصر التفاعلية في البطاقة
- زيادة contrast على `text-muted-foreground` الفاتح في الأرصدة
- `loading="lazy"` على صور الأفاتار + `decoding="async"`
- مراجعة `React.memo` على `CustomerListCard` مع `areEqual` dقيق

### 6. مراجعة واختبار
- قراءة `CustomersPage.tsx`, `CustomerListCard.tsx` بعد التعديلات للتحقق من عدم وجود تعارضات
- اختبار TypeScript build (تلقائي عبر harness)
- اختبار سريع للـ console errors عبر `read_console_logs`
- مراجعة أن RTL يعمل بشكل صحيح للـ swipe (الاتجاه ينعكس)
- التأكد من توافق التغييرات مع memories: `rtl-standard`, `mobile-native-interaction-standards`, `semantic-color-tokens`

## الملفات المتأثرة

```
جديد:
  src/hooks/customers/useCustomerSwipeActions.ts
  src/components/customers/list/CustomerSummaryBar.tsx

تعديل:
  src/components/customers/list/CustomerListCard.tsx       (دمج swipe + a11y)
  src/components/customers/list/CustomerMobileView.tsx     (إضافة summary bar + virtualization + sort options)
  src/pages/customers/CustomersPage.tsx                    (تمرير handlers + sort state persistence)
  src/hooks/customers/useCustomerFilters.ts                (إضافة فلاتر مشتقة: overdue, near-credit-limit) — إن لزم
```

## ترتيب التنفيذ

1. شريط الملخص (تأثير بصري مباشر)
2. Swipe actions (تجربة موبايل أساسية)
3. Virtualization + sort persistence
4. مراجعة a11y/performance
5. اختبار نهائي + قراءة console logs

## نقاط تقنية

- **Swipe في RTL**: المسافات السالبة/الموجبة تنعكس — استخدام `dir`-aware logic أو CSS logical properties (`inline-start/end`)
- **Summary bar tokens**: استخدام `bg-destructive/10`, `bg-warning/10`, `bg-success/10` للحفاظ على نظام الألوان
- **Virtualization مع animations**: تعطيل `animate-fade-in` عند تفعيل virtualization (يسبب flicker مع reposition)
- **useDeferredValue**: تطبيقه على query string فقط، ليس على filter object كامل
