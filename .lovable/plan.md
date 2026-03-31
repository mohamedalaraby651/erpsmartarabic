

# تقرير شامل — قسم العملاء وصفحة العميل

---

## أولاً: الهيكل المعماري

### الملفات والمكونات (48+ ملف)

| المجموعة | الملفات | الوظيفة |
|---|---|---|
| الصفحات | `CustomersPage.tsx`, `CustomerDetailsPage.tsx` | المنسّقان الرئيسيان |
| البطاقات | `CustomerListCard`, `CustomerGridCard`, `CustomerTableView` | 3 طرق عرض |
| النموذج | `CustomerFormDialog` + 4 خطوات Wizard | إضافة/تعديل |
| التبويبات | 9 تبويبات (Invoices, Payments, Notes, Orders, etc.) | تفاصيل 360° |
| الرسوم | `AgingDonutChart`, `CashFlowLineChart`, `TopProductsChart`, `PurchaseChart` | 4 تحليلات |
| الموبايل | `MobileProfile`, `CompressedHeader`, `IconStrip`, `MobileStatCard` | عرض محسّن |
| الخدمات | `customerRepository.ts` (571 سطر), `customerService.ts` | Repository + Domain |
| الهوكات | 7 hooks (`useCustomerDetail`, `List`, `Mutations`, `Filters`, `Navigation`, `BulkSelection`, `DuplicateCheck`) | CQRS كامل |

---

## ثانياً: الوظائف الموجودة والتقييم

### قائمة العملاء (CustomersPage)

| الوظيفة | الحالة | ملاحظات |
|---|---|---|
| بحث debounced (300ms) | يعمل | مع مزامنة URL |
| فلترة (نوع، VIP، محافظة، حالة، تواصل، نشاط) | يعمل | 6 فلاتر |
| Quick Filter Chips (موبايل) | يعمل | مع إعادة ضبط الفلاتر |
| ترتيب (اسم، رصيد، تاريخ، نشاط) | يعمل | Desktop + Mobile |
| 3 أوضاع عرض (جدول/شبكة/قائمة موبايل) | يعمل | مع حفظ التفضيل |
| Infinite scroll (موبايل) | يعمل | IntersectionObserver |
| Server pagination (ديسكتوب) | يعمل | 25 عنصر/صفحة |
| تحديد متعدد + إجراءات جماعية | يعمل | حذف، VIP، تفعيل/تعطيل |
| Long press (موبايل) | يعمل | مع moveThreshold |
| تصدير Excel | يعمل | Batch export حتى 10,000 |
| استيراد | يعمل | عبر `CustomerImportDialog` |
| كشف المكررات + دمج | يعمل | `find_duplicate_customers` RPC |
| Prefetch on hover | يعمل | 200ms delay |
| حالة فارغة (دليل خطوات) | يعمل | 3 خطوات |
| تنبيهات النظام | يعمل | أعلى الصفحة |

### صفحة تفاصيل العميل (CustomerDetailsPage)

| الوظيفة | الحالة | ملاحظات |
|---|---|---|
| Hero Header مع KPIs تفاعلية | يعمل | 3 بطاقات → Timeline Drawer |
| Smart Alerts (4 أنواع) | يعمل | ائتمان، تأخر، خمول، جديد |
| ملاحظة مثبتة | يعمل | `CustomerPinnedNote` |
| 14 تبويب Lazy-loaded | يعمل | Suspense + TabSkeleton |
| تنقل سابق/تالي | يعمل | `useCustomerNavigation` + sessionStorage |
| Inline editing (VIP + حالة) | يعمل | Dropdown + Toggle |
| رفع/تغيير صورة | يعمل | `ImageUpload` + bucket |
| إجراءات سريعة (فاتورة، دفعة، عرض سعر، أمر بيع) | يعمل | في Hero + DropdownMenu |
| تصدير Excel متعدد الصفحات | يعمل | من Hero Menu |
| كشف حساب + طباعة | يعمل | تبويب مخصص |
| تقرير أعمار الديون | يعمل | تبويب مخصص |
| 4 رسوم بيانية تحليلية | يعمل | شهرية + Aging + CashFlow + TopProducts |
| عناوين متعددة | يعمل | CRUD كامل |
| تذكيرات | يعمل | مع تكرار وربط بفواتير |
| سجل التواصل | يعمل | أنواع متعددة |
| مرفقات | يعمل | بحث + تصنيف + انتهاء |
| إشعارات دائنة | يعمل | تبويب مخصص |
| سجل النشاط | يعمل | آخر 20 نشاط |

### الموبايل (صفحة التفاصيل)

| الوظيفة | الحالة | ملاحظات |
|---|---|---|
| MobileProfile (Hero كامل) | يعمل | Avatar + KPIs + Actions |
| Sticky CompressedHeader | يعمل | IntersectionObserver |
| IconStrip (11 أيقونة) | يعمل | تمرير أفقي |
| أقسام in-place | يعمل | بدون nested navigation |
| MobileDetailHeader | يعمل | إخفاء FAB + BottomNav |

---

## ثالثاً: المشاكل والأخطاء المكتشفة

### مشاكل حرجة

| # | المشكلة | الملف | التفاصيل |
|---|---|---|---|
| 1 | **`debtors` غير معروض في stats fallback** | `useCustomerList.ts:107` | الـ fallback object لا يحتوي على `debtors`: `{ total: 0, ... active: 0, inactive: 0 }` — ينقصه `debtors: 0` |
| 2 | **`get_customer_stats` لا يفلتر بالـ tenant** | Migration SQL | الدالة تعد جميع العملاء في النظام بدون `WHERE tenant_id = get_current_tenant()` — خلل أمني في بيئة Multi-tenant |
| 3 | **Quick filter "debtors" يستخدم status filter** | `CustomersPage.tsx:106` | يتم `setStatusFilter('debtors')` لكن `CustomerFiltersBar` chip لا يعرف القيمة `debtors` — فلتر `status` chip يعرض "نشط/غير نشط" فقط |
| 4 | **البحث لا يختفي عند التمرير** | `CustomersPage.tsx` | مطلوب حسب الخطة الأصلية لكن لم يُنفّذ بعد |

### مشاكل متوسطة

| # | المشكلة | الملف | التفاصيل |
|---|---|---|---|
| 5 | **تبويب "activity" يجلب 20 سجل فقط** | `customerRepository.ts:489` | `.limit(20)` قد لا يكفي لعملاء قدامى |
| 6 | **Invoices/Payments محدودة بـ 500** | `customerRepository.ts:433,444` | لعملاء كبار قد يكون غير كافٍ ولا يوجد pagination داخل التبويبات |
| 7 | **`CustomerFiltersBar` chip لا يعرض "مدين"** | `CustomerFiltersBar.tsx:44` | عند تطبيق quick filter "debtors"، الـ active chip يعرض نص غير واضح لأن statusFilter = 'debtors' ليس ضمن الشروط المعروفة |
| 8 | **CustomerHeroHeader avatar لا يستخدم `shape` أو `vipBorder`** | `CustomerHeroHeader.tsx:93` | Avatar في Hero الديسكتوب يستخدم الشكل الدائري الافتراضي بدون إطار VIP |
| 9 | **لا يوجد فلتر "مزارع" في Quick Filter chips** | `CustomerStatsBar.tsx:32-38` | الـ chips تشمل أفراد وشركات لكن لا يوجد chip لـ "مزارع" رغم أنه نوع عميل مدعوم |
| 10 | **`onNewPayment` غير ممرر لـ `CustomerListCard`** | `CustomerMobileView.tsx:114` | الـ prop `onNewPayment` غير ممرر مما يجعل زر "دفعة" لا يظهر في البطاقة الموسّعة |

### نواقص وظيفية (مقارنة بالخطة والوثائق)

| # | الناقص | التفاصيل |
|---|---|---|
| 11 | **لا يوجد `farms` count في stats** | `get_customer_stats` تُرجع `farms` لكن `CustomerStatsBar` desktop لا يعرضه كعنصر منفصل |
| 12 | **`last_transaction_date` في `CustomerListCard`** | يُشير إلى حقل `customer.last_transaction_date` الذي قد لا يكون موجوداً في schema (الحقل المتاح هو `last_activity_at`) |
| 13 | **CLV لا يخصم Credit Notes** | في `calculateCustomerHealth` يتم حساب `clv = totalPurchases` بدون خصم المرتجعات، مخالف للتوثيق في `financial-kpi-logic` |
| 14 | **لا توجد pagination داخل تبويبات التفاصيل** | التوثيق يذكر "20 عنصر لكل صفحة" لكن التبويبات تجلب 500 عنصر دفعة واحدة |

---

## رابعاً: تقييم الأمان

| البند | الحالة | ملاحظات |
|---|---|---|
| Permission checks قبل الحذف | آمن | `canDeleteCustomer()` server-side |
| Permission checks قبل التعديل | آمن | `verifyPermissionOnServer` |
| Financial limits | آمن | `verifyFinancialLimit` |
| Rate limiting | مدعوم | `check_rate_limit` RPC |
| SoD (فصل المهام) | مدعوم | `check_sod_violation` RPC |
| **`get_customer_stats` بدون tenant filter** | **خلل أمني** | يعرض إحصاءات كل العملاء في النظام |
| Optimistic delete rollback | آمن | `onError` يعيد البيانات السابقة |
| Batch validation قبل الحذف الجماعي | آمن | يمنع حذف عملاء بفواتير مفتوحة |

---

## خامساً: تقييم الأداء

| البند | الحالة | ملاحظات |
|---|---|---|
| Lazy loading للتبويبات | ممتاز | `React.lazy` + `Suspense` |
| `keepPreviousData` | ممتاز | يمنع وميض القائمة |
| Prefetch on hover | ممتاز | يسرّع فتح التفاصيل |
| `memo` على المكونات | ممتاز | معظم المكونات مغلفة |
| `staleTime` على الاستعلامات الثانوية | جيد | 60 ثانية |
| **500 فاتورة/دفعة بلا pagination** | **قابل للتحسين** | قد يبطئ للعملاء الكبار |
| **كل التبويبات تُحمّل عند mobile** | **قابل للتحسين** | `isMobile` يجعل بعض queries دائمة |

---

## سادساً: ملخص الإجراءات المطلوبة

### أولوية عالية (أمان + وظيفي)
1. إضافة `WHERE tenant_id = get_current_tenant()` لدالة `get_customer_stats`
2. إضافة `debtors: 0` للـ fallback في `useCustomerList.ts:107`
3. إصلاح chip "مدين" في `CustomerFiltersBar` ليعرض نصاً واضحاً
4. تمرير `onNewPayment` لـ `CustomerListCard` من `CustomerMobileView`

### أولوية متوسطة (اكتمال الخطة)
5. إخفاء البحث عند التمرير (موبايل)
6. إضافة `vipBorder` و `shape` لـ Avatar في `CustomerHeroHeader`
7. تصحيح CLV ليخصم Credit Notes
8. التحقق من وجود حقل `last_transaction_date` أو استبداله بـ `last_activity_at`

### أولوية منخفضة (تحسين)
9. إضافة chip "مزارع" في `CustomerStatsBar`
10. Pagination داخل تبويبات التفاصيل (بدل limit 500)
11. زيادة limit النشاطات من 20

