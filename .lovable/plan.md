## دراسة صفحة العملاء (المعيار)

### الهيكل العام للجوال
```
PageWrapper
└── space-y-3 (mobile)
    ├── CustomerPageHeader
    │     ├── شريط بحث بارز (CustomerSearchPreview – مرتفع 44px)
    │     └── صف عنوان مدمج:
    │           [h1 text-base] [chip count text-xs px-2 py-0.5 rounded-full]
    │           ←→ [زر أيقوني h-10 w-10 rounded-xl] × 2-3
    ├── CustomerStatsBar  ← chips أفقية scrollable
    │     شريحة واحدة: h-9 px-3 rounded-lg text-xs + Icon h-3.5 + عدّاد دائري h-[18px]
    ├── CustomerFiltersBar (drawer trigger)
    └── قائمة CustomerListCard (space-y-2)
          بطاقة: p-3.5، border-s-[3px]
          • Avatar sm + name text-sm bold + نقطة حالة 2×2 + شارة تنبيه h-4
          • نوع text-[11px]، VIP pill text-[10px]
          • الرصيد text-sm bold + label text-[10px]
          • صف موقع/هاتف text-[11px] مع أيقونات h-3
          • شريط ائتمان h-1.5
          • Long-press → menu، Swipe → فاتورة/اتصال
```

### المقاييس الموحّدة المعتمدة
| عنصر | القياس |
|---|---|
| تباعد عمودي للصفحة | `space-y-3` |
| ارتفاع زر أيقوني للأدوات | `h-10 w-10 rounded-xl` |
| chip أفقي قابل للنقر | `h-9 px-3 rounded-lg text-xs` + أيقونة `h-3.5` + عدّاد `h-[18px] text-[10px]` |
| عنوان قسم/صفحة | `text-base font-bold` |
| نص أساسي للبطاقة | `text-sm font-medium` |
| نص ثانوي | `text-[11px] text-muted-foreground` |
| نص تلميح | `text-[10px]` |
| حشوة بطاقة قائمة | `p-3.5` |
| تباعد عناصر داخل البطاقة | `gap-3` |
| أيقونات داخل البطاقة | `h-3 / h-3.5` |
| Badge صغير | `h-4 px-1.5 text-[10px] rounded-full` |
| نقطة حالة | `h-2 w-2 rounded-full` |
| ارتفاع لمسة لمس | ≥ 44px |

---

## الفجوات الحالية في الداشبورد (مقارنة بالمعيار)

1. **Hero ضخم** يأخذ ارتفاعًا كبيرًا، بينما العملاء عنوان مدمج في صف واحد.
2. **FinancialKPIRow**: 8 بطاقات scrollable كبيرة (`min-w-[140px]`، h≈58px) — بينما المعيار `chips h-9`.
3. **StatsWidget**: شبكة 2×2 من بطاقات `p-2.5` بأرقام `text-base` — مكررة لما في الـ KPI.
4. **TasksWidget / RecentInvoicesWidget**: صفوف `bg-muted/50 rounded-lg min-h-[44px]` بدون نفس الهوية البصرية للبطاقة (border-s-[3px]، p-3.5، تسلسل العناصر).
5. **TodayPerformanceWidget**: بطاقات `p-2` صغيرة بدون فواصل/أيقونات بنفس المقاس.
6. لا يوجد **شريط chips أفقي** للتنقل السريع بين الـ widgets (Tasks / Invoices / Today / Quick Actions).
7. التباعد العمودي للصفحة `space-y-3 sm:space-y-6` لكن داخل WidgetContainer مازال `gap-2.5 sm:gap-4` — يختلف عن نمط العملاء.

---

## الخطة (تطبيق نفس بنية صفحة العملاء على الداشبورد)

### 1) `src/pages/Dashboard.tsx` — Hero مدمج بنمط CustomerPageHeader
استبدال الـ hero الحالي بصف بنفس بنية العملاء:
```
[h1 text-base "صباح الخير، {name}"] [chip role text-xs px-2 py-0.5 rounded-full]
                                  ←→ [AlertsBell h-10 w-10] [زر + h-10 w-10 rounded-xl]
```
- إزالة gradient الكبير → بطاقة مسطّحة بسيطة بدون padding كبير (`py-1`).
- نقل التحية إلى سطر مدمج + chip للدور + chip للـ tenant (text-[10px] h-4).
- زر "+" بصيغة `h-10 w-10 rounded-xl border bg-card` بدلاً من زر مملوء كبير.

### 2) `FinancialKPIRow.tsx` — تحويل إلى شريط KPI-Chips بنمط `CustomerStatsBar`
بدلاً من 8 بطاقات scroll كبيرة:
```
chip أفقي: [Icon h-3.5] [label text-xs] [قيمة tabular-nums text-[11px] h-[18px] bg-muted/primary-foreground/20 rounded-full]
الارتفاع h-9 px-3 rounded-lg، نفس مكونات chip العملاء
```
- نفس آلية `ScrollArea` + `pb-1` + `gap-2`.
- النقر يفتح المسار (نفس آلية href الحالي).
- على ≥ md تتحول إلى grid 4 أعمدة بصيغة بطاقات (كما هو، بدون تغيير ديسكتوب).

### 3) `StatsWidget.tsx` — تحويل إلى شريط chips أيضًا (نفس النمط)
- إزالة شبكة 2×2 الكبيرة على الجوال.
- صف chips أفقي قابل للتمرير: [العملاء 12] [المنتجات 50] [عروض 8] [فواتير 30 ↑12%].
- على ≥ md يبقى grid 4 الحالي.
- الترند يظهر داخل العدّاد بلون success/destructive.

### 4) `TasksWidget.tsx` — صف مهمة بنمط CustomerListCard المصغّر
نموذج كل صف:
```
Card rounded-lg border-s-[3px] (لون الأولوية بدلاً من vip)
  p-3 (بدلاً من 2.5)
  ├── نقطة أولوية h-2 + عنوان text-sm font-medium truncate
  ├── ميتا: Clock h-3 + التاريخ text-[11px] text-muted-foreground
  └── Badge أولوية: h-4 px-1.5 text-[10px] rounded-full (نفس badge شارة تنبيه العملاء)
```
- إضافة long-press → menu (إكمال / حذف) كما في `useLongPress`.
- header القسم بنفس بنية CustomerPageHeader المدمج: `text-base font-bold` + count chip + زر "عرض الكل" h-9 px-3.
- skeleton 5 صفوف بنفس ارتفاع 56px.

### 5) `RecentInvoicesWidget.tsx` — صف فاتورة بنمط CustomerListCard
```
Card rounded-lg border-s-[3px] (لون حسب payment_status)
  p-3
  ├── Avatar مربّع h-9 w-9 rounded-md bg-primary/10 + Receipt h-4
  ├── min-w-0:
  │     [اسم العميل text-sm font-medium truncate] [نقطة حالة h-2]
  │     [رقم الفاتورة + تاريخ text-[11px] فاصل ·]
  ├── يسار:
  │     [المبلغ text-sm bold tabular-nums]
  │     [Badge حالة h-4 px-1.5 text-[10px]]
  └── ChevronDown h-4 (يفتح InvoiceQuickActions داخل البطاقة)
```
- نقل أزرار `InvoiceQuickActions` (Eye/Printer/BellPlus) إلى صف يظهر فقط عند التوسيع بنفس آلية `expanded` في CustomerListCard.
- إضافة swipe gestures: يسار → quick payment، يمين → اتصال بالعميل (إن وُجد رقم).
- إزالة الأزرار الظاهرة دائمًا → تخفيف العرض البصري بشكل كبير.

### 6) `TodayPerformanceWidget.tsx` — توحيد الكروت
- استبدال بطاقات `p-2 bg-muted/50` بـ chips أفقية على الجوال (نفس نمط KPI/Stats): 4 chips × `h-10`.
- شكل chip: `[Icon h-3.5 in colored circle h-6 w-6] [title text-[11px]] [value text-xs bold] [↑% text-[10px]]`.
- على ≥ sm يبقى grid 2×2 الحالي.

### 7) `WidgetContainer.tsx` + ترتيب الصفحة
- تباعد عمودي موحّد: `space-y-3` على الجوال (مطابق لـ CustomersPage)، `sm:space-y-5`.
- داخل WidgetContainer: `gap-3` بدل `gap-2.5`.
- ترتيب افتراضي مقترح للجوال: `Hero → KPI-chips → Stats-chips → Today-chips → Tasks → Invoices`.
- إضافة CollapsedSummaryBar اختياري لطي قسم KPI/Stats عند الحاجة (مماثل لـ `layout.prefs.compact` في العملاء) — لاحقًا، خارج هذه المرحلة.

### 8) Shared utility — `mobile-row` و `mobile-chip` classes
- إنشاء `src/components/dashboard/_shared/DashboardChip.tsx` للـ chip الموحّد (KPI/Stat/Today)، يستقبل `{label, value, icon, tone, href, trend?}`.
- إنشاء `src/components/dashboard/_shared/DashboardListCard.tsx` للصف الموحّد (مهمة/فاتورة)، يستقبل `{leading, title, meta, trailing, accentTone, onTap, onLongPress?}`.
- يضمن نفس المقاييس بالضبط (border-s-[3px]، p-3، gap-3، text-sm/[11px]/[10px]).

---

## معايير القبول
- على عرض 393×699px:
  - الـ Hero + شريط KPI + شريط Stats + أوّل صفّين من Tasks وأوّل فاتورتين تظهر **بدون أي تمرير**.
  - باقي المحتوى ضمن تمريرة قصيرة واحدة.
- جميع أزرار الأدوات `h-10 w-10` (≥ 44px).
- جميع البطاقات تستخدم نفس `text-sm / text-[11px] / text-[10px]` و `p-3 / p-3.5`.
- لا تغيير على تخطيط ≥ md (الديسكتوب يبقى كما هو).
- لا تعديل في منطق البيانات أو RPCs.
- إضافة long-press في Tasks/Invoices لا يكسر النقرة العادية.

## ترتيب التنفيذ
1. إنشاء `DashboardChip` و `DashboardListCard` المشتركان.
2. تحديث `Dashboard.tsx` (Hero مدمج + تباعد).
3. إعادة كتابة `FinancialKPIRow` و `StatsWidget` و `TodayPerformanceWidget` لاستخدام `DashboardChip` على الجوال.
4. إعادة كتابة `TasksWidget` و `RecentInvoicesWidget` لاستخدام `DashboardListCard` (مع توسيع داخلي لإجراءات الفاتورة).
5. تحديث `WidgetContainer` للتباعد.
6. مراجعة بصرية على 393px (لقطة شاشة) للتأكد من المعايير.
