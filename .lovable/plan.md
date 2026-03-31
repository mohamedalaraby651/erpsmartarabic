مراجعة ونقد التنفيذ الحالي

## المشاكل المكتشفة

### 1. خطأ Runtime: فشل تحميل PageTransition

هناك خطأ في تحميل `PageTransition.tsx` ديناميكياً. الملف موجود وسليم، لكن الخطأ يشير لمشكلة في الـ build/cache. الحل: إعادة بناء المشروع أو تحويل الاستيراد من lazy إلى استيراد مباشر في `AppLayout.tsx`.

### 2. الهيدر المضغوط يظهر/يختفي بشكل مفاجئ (بدون smooth transition)

عند التمرير، يظهر `CustomerCompressedHeader` بـ `animate-fade-in` فقط عند الظهور، لكن عند العودة للأعلى يختفي فجأة (conditional render بدون exit animation). هذا يسبب "وميض" بصري مزعج.

### 3. الهيدر المضغوط لا يكون sticky فعلياً بشكل صحيح

الـ `sticky top-0` موضوع داخل `div.space-y-4` الذي هو محتوى عادي (ليس scroll container). في حالة أن الصفحة الكاملة هي الـ scroll container، الـ sticky يعمل فقط إذا كان الأب ليس `overflow: hidden`. يجب التأكد من أن سلسلة الآباء لا تمنع الـ sticky.

### 4. `onCall` و `onMoreActions` في CompressedHeader بقيم غير مفيدة

```typescript
onCall={() => {}}        // لا يفعل شيئاً
onMoreActions={onEdit}   // يفتح تعديل بدل قائمة إجراءات
```

- `onCall` فارغ رغم أن العميل لديه هاتف — يجب ربطه بـ `tel:` مباشرة
- `onMoreActions` يفتح نموذج التعديل بدلاً من فتح sheet الإجراءات السريعة

### 5. شريط الأيقونات لا يتثبت (not sticky)

عند التمرير لأسفل في قسم طويل (مثل الفواتير)، شريط الأيقونات يختفي مع التمرير. يجب أن يكون sticky تحت الهيدر المضغوط لسهولة التنقل بين الأقسام.

### 6. لا يوجد scroll-to-section عند اختيار قسم

عند الضغط على أيقونة في الشريط، المحتوى يظهر لكن لا يتم التمرير تلقائياً إليه — خاصة إذا كان الهيدر الكامل يحجب المحتوى الجديد.

### 7. `MobileDetailHeader` يظهر مع الهيدر الكامل = تكرار

`MobileDetailHeader` (سطر 259) يعرض اسم العميل وزر تعديل، والـ `CustomerMobileProfile` يعرض نفس المعلومات. هذا تكرار بصري.

### 8. لا يوجد مؤشر بصري للقسم المفتوح في الشريط عند التمرير

عندما يكون المستخدم في قسم طويل ويتمرر، لا يعرف أي قسم مفتوح لأن الشريط اختفى.

---

## خطة الإصلاح

### الملفات المتأثرة

- `src/pages/customers/CustomerDetailsPage.tsx`
- `src/components/customers/mobile/CustomerCompressedHeader.tsx`
- `src/components/layout/AppLayout.tsx` (لإصلاح خطأ PageTransition)

### التعديلات المطلوبة

1. **إصلاح PageTransition**: تحويل من lazy import إلى import مباشر في AppLayout لتجنب خطأ التحميل الديناميكي.
2. **جعل شريط الأيقونات sticky**: وضعه مع الهيدر المضغوط في container واحد sticky، بحيث عند التمرير يظهر الهيدر المضغوط + الشريط معاً.
3. **إصلاح onCall و onMoreActions**: ربط `onCall` بـ `window.open(tel:...)` وربط `onMoreActions` بفتح sheet الإجراءات.
4. **إضافة scroll-into-view**: عند اختيار قسم من الشريط، عمل `scrollIntoView` للمحتوى.
5. **إزالة تكرار MobileDetailHeader**: الاكتفاء بزر الرجوع فقط بدون عنوان وزر تعديل مكرر.
6. تحسين ألوان وعرض الايقونات 
7. ارجاع الشريط الثابت الخاصة بالمشروع ككل 