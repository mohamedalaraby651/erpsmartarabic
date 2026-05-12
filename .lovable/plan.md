
## نطاق الخطة
تطوير تجربة صفحة تفاصيل العميل على الموبايل فقط (`CustomerDetailsPage.tsx` + ملفات `components/customers/mobile/*` و`CustomerCompressedHeader`). لا تغيير في الـ backend/الاستعلامات.

---

## المشاكل المكتشفة

### 1) ارتفاع البطاقة العلوية + ازدحام بصري
- بطاقة `CustomerMobileProfile` تستهلك ~70% من شاشة 393×699 (Avatar + اسم + شارة VIP + الحالة + الموقع + KPIs + شريط الائتمان + 3 صفوف أزرار = صفّان من الإجراءات).
- النتيجة: المستخدم يضطر للتمرير قبل الوصول لشريط الأقسام والمحتوى.

### 2) شريط الأقسام (Icon Strip) لا يكفي
- 6 أيقونات ثابتة + زر "المزيد" → 5 أقسام مهمة مدفونة (aging، communications، notes، info، attachments) بينما `aging` في ازدياد الأهمية للديون.
- لا يوجد مؤشر بصري واضح للقسم النشط داخل المحتوى نفسه (يعتمد فقط على لون الأيقونة).

### 3) الإجراءات الأساسية مكررة وغير مرتبة
- "فاتورة/دفعة/كشف" تظهر 3 مرات: (أ) داخل بطاقة الملف، (ب) داخل الـ Compressed header عند التمرير، (ج) داخل FAB (`CustomerMobileFAB`).
- هذا يربك المستخدم ويزيد الـ taps الخاطئة.

### 4) ضعف الاكتشاف والتنقل
- `CustomerSwipeHint` يظهر مرة واحدة لكنه لا يوضح أن السحب يعمل فقط في الأقسام الأساسية (وليس الثانوية)، فيشعر المستخدم بأن الأقسام الثانوية "مكسورة".
- زر "العودة للملخص" صغير ومخفي أعلى يسار العنوان.
- `CustomerNavStrip` (التنقل بين العملاء) في الأعلى يأخذ مساحة قبل المحتوى المهم.

### 5) الإجراءات السياقية ضعيفة
- لا يوجد سطر اتصال سريع ثابت في الـ Compressed header (الاتصال مخفي خلف `min-[360px]`).
- نسخ الهاتف، WhatsApp، الاتصال موجودة بثلاثة أزرار منفصلة → كان يكفي زر اتصال + قائمة سفلية لخيارات أخرى.
- لا يوجد إجراء "إرسال تذكير دفع" مباشرة من البطاقة رغم ظهور المتأخرات في badge.

### 6) شريط الائتمان دائماً قابل للقراءة بصعوبة
- يعرض فقط حين `creditLimit > 0`، لكن حين يتجاوز العميل الحد يصير اللون أحمر دون CTA واضح ("راجع/زِد الحد").

### 7) تجربة الهاتف الصامتة
- لا يوجد توست/feedback عند تفعيل/تعطيل العميل من البطاقة.
- "نسخ الهاتف" يعرض check لكن بدون `aria-live`/toast، لا يصل للمستخدم بثقة.

### 8) أداء وانتقالات
- `IntersectionObserver` للـ compressed header يعمل مع `rootMargin: -48px` بينما لا يوجد أي عنصر sticky بارتفاع 48px → يقفز الهيدر مبكراً/متأخراً حسب جهاز المستخدم.
- Tab content يستخدم `key={mobileSection}` → يعيد التركيب بالكامل عند كل تنقل، مما يفقد scroll position.

### 9) Pull-to-refresh لا يربط الانتعاش بكل البيانات
- `WindowPullToRefresh` (مضاف سابقاً) — لكن لا يبدو أنه يبطل cache لـ `customer-financial-summary`/`customer-chart-data` بشكل واضح للمستخدم (لا spinner لكل قسم).

### 10) Quick Suggestions مفيدة لكن مكانها ضعيف
- تظهر فقط حين `mobileSection === 'none'` ويتم استبدالها فور دخول قسم → تفقد المستخدم سياق "الإجراء التالي".

---

## التحسينات المقترحة

### A. تكثيف البطاقة العلوية (Hero compact)
- صف واحد: صورة (sm) + اسم + شارة VIP + شارة الحالة، كل ذلك أفقياً.
- KPIs في صف من 2 (الرصيد + المتأخرات) بدل 4، مع رابط "كل المؤشرات" → يفتح تبويب التحليلات.
- شريط الائتمان يظهر فقط كخط رفيع (h-1) أسفل الاسم + نسبة % كرقم صغير. التفاصيل في لمسة (Sheet).
- صف إجراء واحد: [فاتورة • دفعة • كشف • ⋯]

### B. إعادة تنظيم شريط الأقسام
- نقل `aging` إلى الـ PRIMARY بدلاً من `analytics` (الأقدمية أهم في ERP عربي).
- إضافة شارة عدد للقسم النشط داخل عنوان المحتوى (`SectionHeader`).
- استبدال "العودة للملخص" بـ chevron كبير في يمين العنوان بـ min-h-11.

### C. توحيد الإجراءات وإلغاء التكرار
- إزالة الإجراءات الفرعية من `CustomerMobileProfile` عندما يكون `CustomerMobileFAB` فعّالاً.
- في `CustomerCompressedHeader`: إظهار **اتصال** دائماً عند توفر رقم (إزالة `hidden min-[360px]:inline-flex`)، ودمج "دفعة" داخل قائمة `⋯`.
- FAB يصير مصدر الإجراءات السريعة الوحيد (فاتورة/دفعة/عرض/أمر بيع/إشعار دائن).

### D. تحسين قابلية الاكتشاف
- نقل `CustomerNavStrip` إلى الـ Compressed header (سهمين بجانب الاسم) لتحرير مساحة فوقية.
- توسيع `CustomerSwipeHint` ليُظهر أن السحب متاح بين 6 أقسام أساسية فقط، مع نقطة تشير للموضع الحالي (Pagination dots).

### E. سياق الإجراءات الذكية
- داخل بطاقة الملف، حين `overdueCount > 0`: إظهار شريط رفيع "n فواتير متأخرة → إرسال تذكير" بزر مباشر.
- زر "نسخ الهاتف" يستبدل بـ toast واضح + `aria-live="polite"`.
- إضافة CTA "زيادة الحد/مراجعة" حين تجاوز حد الائتمان.

### F. تحسين أداء وانتقالات
- ضبط `rootMargin` للـ IntersectionObserver بناءً على ارتفاع الـ MobileDetailHeader الفعلي (قياس عبر `getBoundingClientRect`).
- إزالة `key={mobileSection}` من حاوية المحتوى والاحتفاظ بالـ animate-fade-in عبر `data-state`، لمنع unmount/remount غير الضروري.
- حفظ scroll position لكل قسم في `sessionStorage` (مفتاح: `customer-${id}-${section}`).

### G. تحسين Pull-to-refresh
- إضافة `aria-busy` و spinner علوي ثابت أثناء التحديث، وتجميع `invalidateQueries` لمفاتيح: customer، financial-summary، invoices، payments، chart-data.

### H. تحسين Long-press و Sheets
- VIP long-press: إضافة hint بصري (خط منقّط حول الشارة) في أول زيارة.
- استبدال `MoreHorizontal` sheet العام ببطاقة Quick Actions موحّدة (تشمل: تعديل، عرض سعر، أمر بيع، إشعار دائن، تذكير، مرفقات).

---

## التغييرات الفنية (ملفات وحدودها)

```text
src/pages/customers/CustomerDetailsPage.tsx
  - تمرير overdueCount + onSendReminder + scroll-position save/restore
  - تعديل rootMargin للـ IntersectionObserver
  - إعادة ترتيب PRIMARY_STRIP_IDS

src/components/customers/mobile/CustomerMobileProfile.tsx
  - تحويل البطاقة لتخطيط أفقي مكثف
  - تقليل الإجراءات لصف واحد + ⋯
  - شريط ائتمان رفيع + Sheet للتفاصيل
  - شريط "متأخرات → تذكير" شرطي

src/components/customers/mobile/CustomerIconStrip.tsx
  - نقل aging إلى PRIMARY، نقل analytics إلى SECONDARY
  - تحسين edge fades

src/components/customers/mobile/CustomerCompressedHeader.tsx
  - إظهار زر الاتصال دائماً عند توفر هاتف
  - دمج التنقل بين العملاء (سهمين قبل الاسم)
  - دمج "دفعة" في ⋯

src/components/customers/mobile/CustomerSwipeHint.tsx
  - Pagination dots للأقسام الأساسية + نص أوضح

src/components/customers/mobile/CustomerNavStrip.tsx
  - إخفاؤه على الموبايل (الانتقال داخل الـ Compressed header)
```

لا تعديل على الـ hooks أو الـ repositories أو الـ Supabase. التغيير كله في طبقة العرض.

---

## المخرجات المتوقعة
- ارتفاع الـ above-the-fold ينخفض بنسبة ~35% → يظهر شريط الأقسام والمحتوى مباشرة.
- إجراء واحد فقط لكل وظيفة (لا تكرار).
- تنقل أوضح بين الأقسام مع حفظ scroll position.
- استجابة أوضح للمستخدم (toasts/aria-live) في الإجراءات الصامتة.
