## التشخيص — مشاكل واجهة قائمة العملاء (موبايل)

### مشاكل سلوكية حرجة (Bugs)

**B1. الكارد ينفتح ثم يُغلق فورًا عند الضغط على اسم العميل**
- السبب الجذري: `useLongPress` يستدعي `onPress` في كلا الحدثين `onTouchEnd` و `onMouseUp`. على Android Chrome تُولَّد أحداث ماوس صناعية (~300ms بعد touchend) → `setExpanded(prev => !prev)` يعمل مرتين فينفتح ثم يغلق.
- المظهر: السهم يدور، المحتوى يبدأ بالظهور ثم يختفي بعد ~300ms.

**B2. زرّان عائمان "+" متطابقان في أسفل الصفحة**
- المصدر: `CustomersPage.tsx` يضيف FAB خاص (سطر 280) **و** `AppLayout.tsx` يحقن `<FABMenu pageContext>` عمومًا. النتيجة زرّان أزرقان متطابقان في الموبايل.
- التأثير: ارتباك المستخدم + كارثة ذاكرة بصرية + يحجبان آخر صف من القائمة.

**B3. Long-press يفتح قائمة منبثقة (DropdownMenu) بدل تفعيل وضع التحديد**
- التوقع المعتاد عربيًا/iOS: long-press = تحديد متعدد (selection mode). الكود الحالي يفتح menu صغيرة من 5 عناصر تكرّر إجراءات الـ FAB والـ swipe.

### مشاكل تخطيط/UX (Layout)

**L1. ازدحام شريط العنوان (top app bar)**
- 5 أيقونات (P / Layers / Bell-34 / Search / Grid) في عرض 393px + سطر تحته فيه 3 أزرار (إضافة كبير + Kebab + Bell-34 ثاني). **زر الإشعارات مكرر مرتين.**

**L2. زر "إضافة" داخل الصفحة + FAB + FABMenu = ثلاثة طرق لنفس الإجراء**
- ينبغي توحيدها: FAB واحد فقط على الموبايل، وإزالة زر "إضافة" من رأس الصفحة (يُنقل إلى قائمة الكيباب).

**L3. شريط البحث بدون إطار وبدون sticky**
- يطفو بين شريطي الأكشنز ولا يبقى مرئيًا أثناء التمرير → فقدان السياق.

**L4. أيقونة المرشّحات (filter sliders) تطفو وحدها في فراغ كبير**
- وضعها الحالي وسط الشاشة بمفردها يهدر مساحة عمودية ~70px. يجب دمجها في شريط الفلاتر/الترتيب.

**L5. صفّ pills الفلتر (الكل/نشط/VIP/مدين) وصفّ pills الترتيب (الأحدث/آخر نشاط/…) متطابقان بصريًا**
- يصعب على المستخدم التمييز بين "الفلترة" و"الترتيب". يحتاجان hierarchy مختلف (مثلاً: الفلتر segmented filled، الترتيب outline + Icon فقط).

### مشاكل بصرية/Design System

**V1. كارد "إجمالي المستحق" بكامله أحمر destructive**
- KPI محايد لكن اللون الأحمر الكثيف يوحي بخطأ. القاعدة: destructive للأخطاء فقط. يجب: كارد محايد (surface-1) + رقم بلون warning + أيقونة ملوّنة.

**V2. حدّ VIP الجانبي (3px) يكاد يكون غير مرئي في الوضع الداكن**
- استخدام `border-s-warning` على خلفية كارد داكنة يضيع. الحل: شريط vertical accent بعرض 4px + glow خفيف، أو chip VIP أوضح.

**V3. شارة "نشط" (نقطة 2px بجوار الاسم) غير قابلة للاكتشاف**
- يجب استخدام نقطة ملوّنة أكبر مع label عند الـ inactive فقط، أو dot + ring.

**V4. شريط ائتمان 69% لونه أصفر — جيد، لكن النسبة (69%) ولوحة "25,000" صغيرة جدًا (10px)**
- يحتاج tabular-nums + font-size 11px للأرقام المالية الحرجة.

**V5. لا توجد فواصل واضحة بين: header / search / summary / filters / sort / list**
- النتيجة: "جدار" متجانس يتعب العين على شاشة طويلة.

### مشاكل وصول/Accessibility

**A1. `min-height` لبعض الـ chips = 36px** — أقل من معيار 44px للمس.
**A2. focus rings مفقودة على الـ summary card الكبيرة** (تستخدم button بدون focus-visible صريح).
**A3. swipe gestures بدون keyboard fallback مرئي** — موجود في الكود لكن غير مُعلَن للمستخدم.

---

## خطة العلاج (4 دفعات قابلة للقياس)

### دفعة 1 — إصلاح الـ Bugs السلوكية (Critical, ~30 دقيقة)

1. **`src/hooks/useLongPress.ts`**: منع double-fire من أحداث الماوس الصناعية بعد touch:
   - إضافة `lastTouchEndAtRef` + تجاهل `onMouseDown/Up` لمدة 500ms بعد آخر `touchend`.
   - بديل أنظف: استخدام Pointer Events (`onPointerDown/Up/Move`) بدل المزج، أو استدعاء `e.preventDefault()` على touchend عندما يكون target hard tap.

2. **إزالة الـ FAB المحلي من `CustomersPage.tsx`** (سطر 275–284):
   - الاحتفاظ بـ `FABMenu` العام فقط، وضمان أن `pageContext='customers'` يحقن إجراء "عميل جديد" + "فاتورة جديدة" + "دفعة" + "استيراد".
   - تعديل `FABMenu` لو لم تكن إجراءات العملاء موجودة.

3. **تحويل long-press إلى selection mode**:
   - `useLongPress.onLongPress` ينادي `onSelect(customer.id)` ويمرّر إشارة لـ `CustomersPage` لفتح وضع التحديد المتعدد.
   - DropdownMenu (Kebab) يبقى متاحًا عبر زر صغير في الزاوية لمن يريده.

### دفعة 2 — تنظيف الـ Header وشريط الأدوات (~45 دقيقة)

4. **`CustomerPageHeader.tsx`**: 
   - إزالة زر "إضافة" الكبير (أصبح في FAB).
   - إزالة الـ Bell المكرر (يبقى الذي في app header العام فقط).
   - تجميع: عنوان "العملاء (15)" + Kebab واحد يحوي [استيراد، تصدير، إعدادات الأعمدة، الحفظ كعرض].

5. **شريط بحث sticky موحّد**:
   - وضع SearchInput + زر فلاتر (sliders icon) في صف واحد sticky `top-14` مع backdrop blur.
   - حذف أيقونة الفلاتر المنفصلة الطافية في المنتصف.

6. **تمييز شريط الفلتر عن شريط الترتيب**:
   - الفلتر: segmented control filled (الكل / نشط / VIP / مدين) — يبقى pills.
   - الترتيب: شريط أصغر outline + icon فقط مع label تحت الأيقونة عند active، أو menu زر "ترتيب: الأحدث ▾" بدلاً من 4 pills.

### دفعة 3 — تحسينات بصرية للكارد والملخص (~45 دقيقة)

7. **`CustomerSummaryBar.tsx`**:
   - تغيير tone من `destructive` إلى surface محايد (`bg-card border-border`) مع: أيقونة ملوّنة destructive، رقم بلون destructive، خلفية محايدة.
   - زيادة الـ padding وتباين الفئات.

8. **`CustomerListCard.tsx`**:
   - VIP accent: استخدام شريط vertical 4px مع لون مشبع + احتمال إضافة gradient خفيف للخلفية فقط لـ platinum/gold.
   - Active dot: نقلها لتكون فوق الـ avatar (دائرة 10px مع ring-2 من لون الكارد) بدل بجانب الاسم.
   - الأرقام المالية: تكبير الـ balance إلى text-base وإضافة `font-mono` خفيف، تكبير نسبة الائتمان إلى 11px.
   - تحسين contrast الـ chevron (50% → 70%).

9. **فواصل بصرية**:
   - إضافة `divide-y divide-border/30` على القسم الكامل، أو `space-y-3` مع خلفية مختلفة لكل segment (header sticky / filters sticky / list scroll).

### دفعة 4 — Accessibility & Polish (~20 دقيقة)

10. كل chips → `min-h-11` (44px).
11. focus-visible rings على summary card و chips الفلتر.
12. إضافة tooltip "اسحب لليمين للاتصال، لليسار لإصدار فاتورة" يظهر مرة عند أول زيارة (localStorage flag).
13. haptic feedback خفيف عند toggle (`navigator.vibrate(10)` خلف feature detect).

---

## الملفات المتأثرة

```text
src/hooks/useLongPress.ts                              [bug fix]
src/pages/customers/CustomersPage.tsx                  [حذف FAB، توحيد الإجراءات]
src/components/customers/list/CustomerListCard.tsx     [بصري + accessibility]
src/components/customers/list/CustomerPageHeader.tsx   [تنظيف header]
src/components/customers/list/CustomerSummaryBar.tsx   [تخفيف tone]
src/components/customers/list/CustomerMobileView.tsx   [دمج البحث + sticky toolbar]
src/components/mobile/FABMenu.tsx                      [ضمان إجراءات pageContext='customers']
```

## معايير القبول

- ✅ الضغط على اسم العميل يفتح/يغلق الكارد بنقرة واحدة (لا double-fire).
- ✅ FAB واحد فقط مرئي في الموبايل، مع قائمة سياقية لإجراءات العملاء.
- ✅ زر "إشعارات" يظهر مرة واحدة في الـ header.
- ✅ أيقونة الفلتر مدمجة مع شريط البحث (sticky).
- ✅ كارد "إجمالي المستحق" لا يظهر باللون الأحمر الكامل.
- ✅ كل أزرار اللمس ≥ 44px.
- ✅ long-press يفتح selection mode (متعدد) بدل قائمة منبثقة.

## ما يبقى كما هو

- منطق البيانات (repositories, queryKeys) — تم العمل عليه سابقًا، لن نلمسه.
- نمط swipe-to-action للاتصال/الفاتورة — يعمل جيدًا ويبقى.
- بنية CustomerListCard العامة — تعديلات بصرية فقط، لا إعادة كتابة.
- ألوان semantic tokens (HSL) — استخدام نفس النظام، فقط نُعيد توزيع الـ tones.

## أسئلة للتأكيد قبل التنفيذ

1. **Selection mode بعد long-press**: هل تريد أن يدخل long-press في وضع تحديد متعدد (مثل WhatsApp/Gmail) ويختفي القائمة المنبثقة الحالية؟ أم تفضّل الإبقاء على القائمة كما هي وحلّ مشكلة الـ double-fire فقط؟

2. **زر "إضافة" الكبير في الـ header**: هل أحذفه نهائيًا (الإضافة عبر FAB فقط)، أم أحوّله إلى زر نصي صغير "+ جديد"؟

إن لم يكن هناك تفضيل، سأطبّق التوصية الافتراضية (Selection mode + حذف زر الإضافة من الـ header).