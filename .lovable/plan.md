
# خطة تنفيذ ربط الميزات المؤسسية بواجهة المستخدم
## Phase 1: Enterprise Features UI Accessibility

---

## ملخص المرحلة

هذه المرحلة تركز على ربط الميزات المؤسسية المبنية فعليا في قاعدة البيانات والـ Hooks بواجهات مستخدم فعلية يمكن الوصول إليها. الميزات التالية موجودة في الكود ولكن بدون UI:

| الميزة | Backend | Hook | UI |
|--------|---------|------|----|
| سلسلة الموافقات | `approval_chains` + `approval_records` | `useApprovalChain` | مفقود |
| قواعد فصل المهام | `sod_rules` + `check_sod_violation` | -- | مفقود |
| مقاييس الاداء | `performance_metrics` + `observability.ts` | -- | مفقود |
| اعدادات المستاجر | `TenantSettings.tsx` موجود | `useTenant` | مفقود من الاعدادات |
| طلبات الموافقة | `approval_records` جدول موجود | `useApprovalChain` | مفقود |

---

## التغييرات المطلوبة

### 1. انشاء 5 صفحات جديدة

#### 1.1 صفحة سلسلة الموافقات (Admin)
**الملف:** `src/pages/admin/ApprovalChainsPage.tsx`
- عرض قائمة بقواعد الموافقات من جدول `approval_chains`
- امكانية اضافة قاعدة جديدة (نوع الكيان، الحد المالي، عدد الموافقين، ادوار الموافقين)
- تعديل وحذف القواعد
- استخدام Supabase مباشرة مع جدول `approval_chains`

#### 1.2 صفحة طلبات الموافقة (للمستخدمين)
**الملف:** `src/pages/approvals/ApprovalsPage.tsx`
- عرض الطلبات المعلقة من جدول `approval_records`
- Tabs: معلقة / موافق عليها / مرفوضة
- ازرار موافقة ورفض (مع سبب الرفض)
- استخدام `useApprovalChain` hook الموجود

#### 1.3 صفحة مقاييس الاداء (Admin)
**الملف:** `src/pages/admin/MetricsPage.tsx`
- عرض Web Vitals (LCP, FID, CLS) باستخدام `reportWebVitals` من `observability.ts`
- عرض بيانات من جدول `performance_metrics`
- عرض احصائيات Rate Limit
- رسوم بيانية باستخدام Recharts الموجود بالفعل

#### 1.4 صفحة قواعد فصل المهام (Admin)
**الملف:** `src/pages/admin/SodRulesPage.tsx`
- عرض قواعد SoD من جدول `sod_rules`
- اضافة/تعديل/حذف القواعد
- كل قاعدة تحتوي: اسم، وصف، الاجراءات المتعارضة، حالة التفعيل

#### 1.5 صفحة ادارة الشركات (Admin)
**الملف:** `src/pages/admin/TenantsPage.tsx`
- عرض جميع الشركات من جدول `tenants` + `user_tenants`
- اضافة شركة جديدة
- تعليق/تفعيل شركة
- عرض عدد المستخدمين لكل شركة

### 2. تحديث الملفات الموجودة

#### 2.1 تحديث `src/App.tsx`
- اضافة 5 Routes جديدة:
  - `/admin/approval-chains` -> `ApprovalChainsPage`
  - `/approvals` -> `ApprovalsPage`
  - `/admin/metrics` -> `MetricsPage`
  - `/admin/sod-rules` -> `SodRulesPage`
  - `/admin/tenants` -> `TenantsPage`

#### 2.2 تحديث `src/lib/navigation.ts`
- اضافة 4 عناصر جديدة في `adminNavItems`:
  - ادارة الشركات (`/admin/tenants`)
  - سلسلة الموافقات (`/admin/approval-chains`)
  - مقاييس الاداء (`/admin/metrics`)
  - قواعد فصل المهام (`/admin/sod-rules`)
- اضافة عنصر "طلبات الموافقة" (`/approvals`) في قسم المالية في `navSections`
- تحديث `routeLabels` بالمسارات الجديدة

#### 2.3 تحديث `src/components/settings/SettingsNavigation.tsx`
- اضافة تبويب "اعدادات الشركة" في `systemTabs` بايقونة `Building2`

#### 2.4 تحديث `src/pages/settings/UnifiedSettingsPage.tsx`
- اضافة `import { TenantSettings } from '@/components/tenant/TenantSettings'`
- اضافة case `'tenant'` في `renderContent()` يعرض `TenantSettings`

#### 2.5 تحديث `src/pages/admin/AdminDashboard.tsx`
- اضافة 4 ازرار وصول سريع للصفحات الجديدة في `adminSections`

#### 2.6 تحسين `src/components/landing/HeroSection.tsx`
- استبدال الـ placeholder الفارغ بمعاينة تفاعلية للوحة التحكم (mockup بسيط بارقام وهمية)

---

## قائمة الملفات

### ملفات جديدة (5):
| الملف | الغرض |
|-------|-------|
| `src/pages/admin/ApprovalChainsPage.tsx` | ادارة قواعد الموافقات |
| `src/pages/approvals/ApprovalsPage.tsx` | طلبات الموافقة |
| `src/pages/admin/MetricsPage.tsx` | مقاييس الاداء |
| `src/pages/admin/SodRulesPage.tsx` | قواعد فصل المهام |
| `src/pages/admin/TenantsPage.tsx` | ادارة الشركات |

### ملفات معدلة (6):
| الملف | التغيير |
|-------|---------|
| `src/App.tsx` | اضافة 5 Routes |
| `src/lib/navigation.ts` | اضافة عناصر Navigation |
| `src/components/settings/SettingsNavigation.tsx` | اضافة تبويب Tenant |
| `src/pages/settings/UnifiedSettingsPage.tsx` | اضافة case tenant |
| `src/pages/admin/AdminDashboard.tsx` | اضافة روابط سريعة |
| `src/components/landing/HeroSection.tsx` | تحسين المعاينة |

---

## التفاصيل التقنية

### الجداول المستخدمة (موجودة فعليا):
- `approval_chains`: قواعد الموافقات (entity_type, amount_threshold, required_approvers, approver_roles)
- `approval_records`: سجلات الموافقات (entity_type, entity_id, status, approved_by, rejection_reason)
- `sod_rules`: قواعد فصل المهام (name, description, conflicting_actions, is_active)
- `tenants`: الشركات (name, slug, domain, subscription_tier, is_active)
- `user_tenants`: ربط المستخدمين بالشركات (user_id, tenant_id, role)
- `performance_metrics`: مقاييس الاداء (metric_name, metric_value, labels)

### الـ Hooks المستخدمة:
- `useApprovalChain`: للموافقات (chains, needsApproval, createApprovalRequest, approveRequest, rejectRequest, getPendingApprovals)
- `useRateLimit`: لفحص Rate Limit (checkRateLimit, isRateLimited)
- `useTenant`: لادارة المستاجرين (tenant, userTenants, switchToTenant)

### الـ RPCs المستخدمة:
- `check_sod_violation`: فحص تعارض المهام
- `needs_approval`: فحص الحاجة للموافقة
- `check_rate_limit`: فحص حد الاستخدام
- `get_current_tenant`: الحصول على المستاجر الحالي

### المكتبات المستخدمة (متوفرة):
- `recharts` للرسوم البيانية في صفحة المقاييس
- `@tanstack/react-query` لجلب البيانات
- `sonner` للاشعارات
- `lucide-react` للايقونات

---

## ترتيب التنفيذ

1. تحديث `navigation.ts` + `App.tsx` (اضافة Routes والعناصر)
2. انشاء الصفحات الخمس بالتوازي
3. تحديث Settings (اضافة تبويب Tenant)
4. تحديث AdminDashboard (اضافة الروابط السريعة)
5. تحسين HeroSection (المعاينة التفاعلية)
