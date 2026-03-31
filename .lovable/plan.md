

# تقرير التدقيق الناقد الشامل — وحدة العملاء (مارس 2026)
## بعد تنفيذ كافة الـ 4 Sprints

---

## 1. الحالة المعمارية — ممتازة

| المحور | النتيجة |
|---|---|
| Repository Pattern | 100% — صفر `supabase` imports في components أو hooks |
| CQRS | 100% — `useCustomerList` (Read) + `useCustomerMutations` (Write) |
| God Component | محلول — `CustomersPage` = 256 سطر (كان 610) |
| Unified Actions | مكتمل — `CustomerActionMenu` بـ 3 variants |
| Permission Checks | مكتمل — export + address delete + form save |
| Mobile Parity | مكتمل — 13 قسم MobileDetailSection |
| Stats Bar | مكتمل — يعرض active/inactive |
| Smart Empty States | مكتمل — تمييز بين "لا بيانات" و"لا نتائج" |
| Cursor Export | مكتمل — batches من 1000 حتى 10000 |
| Search URL Sync | مكتمل — `setSearchQuery` يستدعي `syncToUrl` |

**خلاصة**: كل ما كان في الخطة السابقة تم تنفيذه بنجاح.

---

## 2. المشاكل المتبقية المكتشفة

### 🔴 P0 — أمان ومنطق

**2.1 — `clearAllFilters` لا يمسح البحث**
في `useCustomerFilters.ts` سطر 63-71، `clearAllFilters` يمسح كل الفلاتر **لكن لا يمسح `searchQuery`**:
```typescript
const clearAllFilters = useCallback(() => {
  setTypeFilter('all');
  // ... يمسح كل الفلاتر
  setSearchParams({}, { replace: true });
  // ❌ لا يستدعي setSearchQuery('')
}, [setSearchParams]);
```
**الأثر**: عند ضغط "إزالة الفلاتر" في empty state، البحث يبقى نشطاً والمستخدم يبقى يرى "لا توجد نتائج".

**2.2 — `bulkVipMutation` بدون Permission Check**
في `useCustomerMutations.ts` سطر 86-99، `bulkVipMutation` و `bulkStatusMutation` لا يتحققان من الصلاحيات (`verifyPermissionOnServer`) قبل التنفيذ. فقط `deleteMutation` يتحقق.

**2.3 — Mobile Delete بدون `AlertDialog`**
في `CustomerMobileView.tsx` سطر 31: `onDelete` يُستدعى مباشرة من `SwipeableRow` بدون تأكيد. في Table/Grid يمر عبر `dialogRef.current?.confirmDelete(id)`. على الموبايل، **لا يوجد تأكيد** — السحب يحذف مباشرة.

**2.4 — `exportAll` يرجع `isPartial: false` عند 10000 سجل بالضبط**
في `customerRepository.ts` سطر 330:
```typescript
return { data: allData, isPartial: offset >= maxRecords };
```
إذا كان هناك بالضبط 10000 عميل، `offset` = 10000 = `maxRecords`، فالتحذير **يظهر**. لكن إذا كان هناك 9999 عميل، آخر batch يعيد 999 < 1000 فيتوقف والـ offset = 9000 < 10000 = `isPartial: false`. هذا صحيح. لكن المشكلة: إذا كان هناك 10001 عميل، يتوقف عند 10000 و `isPartial: true` — صحيح. **لا مشكلة هنا**.

### 🟠 P1 — UX ووظائف

**2.5 — Mobile: لا يوجد Empty State ذكي**
`CustomerMobileView.tsx` سطر 54-55 يعرض دائماً "لا يوجد عملاء - ابدأ بإضافة عميلك الأول" حتى عند وجود فلاتر نشطة. لا يميز بين عدم وجود بيانات وعدم مطابقة الفلاتر.

**2.6 — Mobile: لا يوجد أزرار export/import/merge/duplicate**
`CustomerPageHeader.tsx` سطر 30: `!isMobile` يخفي كل أزرار: التصدير، الاستيراد، كشف المكررين، الدمج. المستخدم على الموبايل لا يمكنه الوصول لأي من هذه الوظائف.

**2.7 — `CustomerStatsGrid` — 8 أعمدة على `lg` = مزدحم**
سطر 28: `lg:grid-cols-8` يعني 8 بطاقات في صف واحد على شاشة 1024px-1280px. كل بطاقة ~128-160px عرض. النصوص ستتقطع أو تتداخل.

**2.8 — Lazy Loading في Detail لا يتوافق مع Mobile Sections**
في `CustomerDetailsPage.tsx`، `useCustomerDetail` يعتمد على `activeTab` لتفعيل queries. لكن على الموبايل، كل الأقسام `MobileDetailSection` مرئية (بعضها مغلق). الأقسام المغلقة **لا تؤثر على `activeTab`** → بياناتها لا تُحمل حتى يُفتح القسم.

**المشكلة**: عند فتح قسم "عروض الأسعار" على الموبايل، لا يتغير `activeTab` لأنه يُدار بـ `useState` ولا يتصل بـ `MobileDetailSection` → **البيانات لا تُجلب أبداً**.

هذه مشكلة حرجة: على الموبايل، التبويبات التي تعتمد على `activeTab` للتحميل (quotations, orders, salesOrders, activities, creditNotes) **ستظهر فارغة دائماً** إلا إذا كان المستخدم قد فتح نفس التبويب على Desktop أولاً.

**التحقق**: `useCustomerDetail` يفعّل queries حسب `activeTab`:
- `invoicesNeeded` = `activeTab` in `['invoices', 'financial', 'statement', 'aging', 'analytics']`
- `salesOrders` = `activeTab === 'orders'`
- `quotations` = `activeTab === 'quotations'`
- `activities` = `activeTab === 'activity'`

على الموبايل، `activeTab` = `'addresses'` (القيمة الافتراضية) ولا يتغير أبداً لأن الموبايل لا يستخدم `<Tabs>`. **كل الأقسام المرتبطة بـ activeTab ستكون فارغة**.

**ملاحظة**: الفواتير تعمل لأن `invoicesNeeded` يشمل `'financial'` و `'statement'` و `'aging'`... لكن `activeTab` = `'addresses'` → **الفواتير أيضاً لن تُحمل!**

**هذه هي أخطر مشكلة في القسم حالياً.**

**2.9 — `useCustomerDetail` لا يعالج حالة Mobile بشكل صحيح**
الحل الصحيح: إما تمرير `isMobile` للـ hook ليفعّل كل queries مباشرة، أو ربط `MobileDetailSection` بـ `setActiveTab`.

### 🟡 P2 — تحسينات

**2.10 — Duplicate Detection Dialog لا يتعامل مع التحميل**
عند فتح `DuplicateDetectionDialog`، إذا كان الـ RPC بطيئاً، لا يوجد عرض مرئي للتحميل (لم أتحقق من المكون الداخلي لكن الاستدعاء يمر عبر repository).

**2.11 — `searchPreview` بدون debounce حقيقي**
في `CustomerSearchPreview.tsx` سطر 23: `useDebounce(value, 200)` — الـ debounce 200ms قصير جداً. كل ضغطة مفتاح بعد 200ms تُطلق استعلاماً. المعيار 300-500ms للبحث المباشر.

**2.12 — `CustomerFormDialog` لا يمسح draft عند الإلغاء**
سطر 98-103: `confirmDiscard` يعمل `reset(defaultValues)` لكن لا يستدعي `clearDraft()`. المسودة تبقى محفوظة في `localStorage` ويتم استعادتها في المرة القادمة حتى لو اختار المستخدم "تجاهل التغييرات".

**2.13 — لا يوجد Keyboard Shortcut للبحث**
لا يوجد `/` أو `Ctrl+K` لتفعيل حقل البحث.

**2.14 — Mobile: لا يمكن تبديل View Mode**
على الموبايل يُعرض دائماً `CustomerMobileView`. لا يوجد خيار للتبديل إلى Grid/Table. هذا مقبول كتصميم لكنه يعني أن المستخدم مقيد بعرض واحد.

---

## 3. تقييم الجودة

| المحور | التقييم | السبب |
|---|---|---|
| **Architecture** | 10/10 | Repository + CQRS + Component extraction مثالية |
| **Security** | 8/10 | Permission checks ناقصة في bulk VIP/status |
| **Type Safety** | 9/10 | `applyFilters` typed، return types صريحة |
| **Mobile UX** | 5/10 | **البيانات لا تُحمل على الموبايل** (activeTab bug) |
| **Desktop UX** | 9/10 | Smart empty states، keyboard nav، hover prefetch |
| **Data Safety** | 8/10 | Unsaved changes جيد لكن draft لا يُمسح عند الإلغاء |
| **Performance** | 8/10 | Lazy loading جيد (يعمل فقط على desktop) |
| **Code Quality** | 9/10 | Memo, CQRS, clean separation |
| **Scalability** | 8/10 | Cursor export محدود بـ 10K لكن مع تحذير |

**التقييم الإجمالي: 8.2/10** — لكن مع bug حرج في Mobile (P0)

---

## 4. خطة الإصلاح المقترحة

### الأولوية 1 — إصلاح Mobile Data Loading (حرج)
**المشكلة**: `useCustomerDetail` يعتمد على `activeTab` لتفعيل queries. على الموبايل `activeTab` لا يتغير أبداً → البيانات لا تُحمل.

**الحل**: تعديل `useCustomerDetail` ليقبل `isMobile` parameter. عند `isMobile = true`، يتم تفعيل كل queries بمجرد `!!id` بدون شرط `activeTab`.

أو الحل الأفضل: ربط `MobileDetailSection` بـ callback يستدعي `setActiveTab` عند فتح القسم. هذا يحافظ على lazy loading.

**الملفات المتأثرة**: `useCustomerDetail.ts` + `CustomerDetailsPage.tsx`

### الأولوية 2 — إصلاح clearAllFilters + Mobile Empty State
- `useCustomerFilters.ts`: إضافة `setSearchQuery('')` في `clearAllFilters`
- `CustomerMobileView.tsx`: إضافة props `hasActiveFilters` + `onClearFilters` لعرض empty state ذكي

### الأولوية 3 — Permission Checks للعمليات الجماعية
- `useCustomerMutations.ts`: إضافة `verifyPermissionOnServer('customers', 'edit')` في `bulkVipMutation` و `bulkStatusMutation`

### الأولوية 4 — إصلاح Mobile Delete Confirmation
- `CustomersPage.tsx`: تمرير `handleDeleteRequest` (الذي يفتح AlertDialog) بدلاً من `handleDeleteConfirm` إلى `CustomerMobileView.onDelete`

### الأولوية 5 — تحسينات UX
- مسح draft عند `confirmDiscard` في `CustomerFormDialog`
- إضافة أزرار export/import للموبايل (في dropdown menu)
- تعديل `CustomerStatsGrid` من `lg:grid-cols-8` إلى `lg:grid-cols-4 xl:grid-cols-8`

