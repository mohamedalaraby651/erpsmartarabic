
# تحسينات البنية التحتية المشتركة — تقنية + بصرية

---

## المرحلة 1: نظام عناوين الصفحات (SEO + UX)

### المشكلة
لا توجد أي صفحة تُغيّر `document.title` — كل الصفحات تعرض العنوان الافتراضي فقط. هذا يضر بـ:
- تجربة المستخدم (التبويبات في المتصفح كلها بنفس الاسم)
- SEO
- إمكانية الوصول (Accessibility)

### الحل
- إنشاء hook `usePageTitle(title: string)` يضبط العنوان ديناميكياً مع اسم التطبيق
- تطبيقه على كل الصفحات الرئيسية (~20 صفحة)

### الملفات
| الملف | التغيير |
|---|---|
| `src/hooks/usePageTitle.ts` | **جديد** — Hook بسيط |
| كل صفحة في `src/pages/` | إضافة سطر واحد `usePageTitle('اسم الصفحة')` |

---

## المرحلة 2: تحسين Sidebar Counts (أداء)

### المشكلة
`useSidebarCounts` يُطلق **7 استعلامات متزامنة** كل دقيقتين، منها واحد (`lowStock`) يجلب بيانات كاملة بدلاً من `count` فقط ثم يفلترها في الـ client. هذا:
- يُهدر bandwidth (يجلب كل المنتجات مع مخزونها)
- بطيء على قواعد البيانات الكبيرة

### الحل
- إنشاء RPC function واحدة `get_sidebar_counts()` تُرجع كل الأعداد في استعلام واحد
- تحويل حساب Low Stock إلى الـ server بدلاً من الـ client
- النتيجة: 7 استعلامات → 1 استعلام

### الملفات
| الملف | التغيير |
|---|---|
| Migration | **جديد** — `get_sidebar_counts()` RPC |
| `src/hooks/useSidebarCounts.ts` | تبسيط إلى استعلام RPC واحد |

---

## المرحلة 3: Error Boundary محسّن لكل صفحة

### المشكلة الحالية
- `AppErrorBoundary` موجود لكن يغلف التطبيق بالكامل فقط
- `CustomerErrorBoundary` مكرر (نسخة خاصة)
- باقي الصفحات (فواتير، منتجات، موردين...) **بدون** error boundary — خطأ في أي صفحة يُسقط التطبيق بالكامل

### الحل
- إضافة `PageErrorBoundary` — نسخة خفيفة من `AppErrorBoundary` بـ UI مبسط (inline بدل fullscreen)
- إنشاء `PageWrapper` component يجمع: `PageErrorBoundary` + `usePageTitle` + padding + animation
- حذف `CustomerErrorBoundary` واستخدام `PageWrapper` بدلاً منه
- تطبيق `PageWrapper` تدريجياً على الصفحات الرئيسية

### الملفات
| الملف | التغيير |
|---|---|
| `src/components/shared/PageWrapper.tsx` | **جديد** — ErrorBoundary + Title + Layout |
| `src/components/customers/CustomerErrorBoundary.tsx` | **حذف** |
| `src/pages/customers/CustomerDetailsPage.tsx` | استبدال CustomerErrorBoundary بـ PageWrapper |
| كل صفحة رئيسية | لف المحتوى بـ PageWrapper |

---

## المرحلة 4: تحسين Loading States (بصري)

### المشكلة
- `PageSkeleton` في AppLayout بسيط جداً (مربعات رمادية فقط)
- كل صفحة تعرض Skeleton مختلف أو لا تعرض شيئاً
- لا يوجد Shimmer effect موحد

### الحل
- تحسين `PageSkeleton` الافتراضي ليكون أجمل (shimmer + layout أقرب للمحتوى الحقيقي)
- إضافة `PageLoadingState` component — skeleton أنيق مع header + filters + content area
- استخدامه كـ fallback في كل `Suspense`

### الملفات
| الملف | التغيير |
|---|---|
| `src/components/shared/PageLoadingState.tsx` | **جديد** — Skeleton أنيق وموحد |
| `src/components/layout/AppLayout.tsx` | استبدال PageSkeleton بـ PageLoadingState |

---

## المرحلة 5: تحسينات بصرية مشتركة

### 5.1 تحسين Empty State العام
- إنشاء `SharedEmptyState` component موحد بتصميم أجمل
- أيقونة مع دوائر متداخلة + gradient خفيف + زر CTA واضح
- يُستخدم كبديل للـ empty states البسيطة في الصفحات الأخرى

### 5.2 تحسين NotFound (404)
- الصفحة الحالية بسيطة — تحسينها بتصميم أجمل مع illustration

### الملفات
| الملف | التغيير |
|---|---|
| `src/components/shared/SharedEmptyState.tsx` | **جديد** |
| `src/pages/NotFound.tsx` | تحسين بصري |

---

## ملخص التأثير

| التحسين | الأثر | الصعوبة |
|---------|-------|---------|
| Page Titles | كل الصفحات تحصل على عنوان مناسب | سهل |
| Sidebar RPC | 7 استعلامات → 1 (أسرع بـ 5x) | متوسط |
| PageWrapper + ErrorBoundary | حماية كل صفحة من الأعطال | متوسط |
| Loading States | تجربة تحميل موحدة وأجمل | سهل |
| Shared Empty State + 404 | تصميم بصري أفضل عبر النظام | سهل |

**الملفات الجديدة:** 4
**الملفات المعدلة:** ~25
**الملفات المحذوفة:** 1
