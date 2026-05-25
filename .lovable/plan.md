
# خطة: مركز إعدادات التصدير الموحّد

دمج كل ما يخصّ التصدير (PDF / Excel / النسخ الاحتياطي / مهام الخلفية) في صفحة واحدة قابلة للوصول من **الإعدادات → التصدير**، بدلاً من التشتت الحالي بين 4 تبويبات منفصلة (`pdf-engine`, `backup`, `export`, جزء من `invoices`).

---

## الوضع الحالي (الموجود فعلاً)

- `PdfEngineSettings.tsx` — تبويب «محرك PDF» (auto/on/off)
- `InvoiceSettingsSection.tsx` — يحتوي على اختيار خط PDF (`pdf_font`)
- `BackupTab.tsx` — تبويب «النسخ الاحتياطي»
- `SettingsExportImport.tsx` — تبويب «تصدير الإعدادات»
- `/dev/pdf-jobs`, `/dev/pdf-telemetry` — لوحات تشخيصية مخفية للمطور فقط

المشكلة: المستخدم يجب أن يتنقّل بين 4 أماكن مختلفة لضبط أي شيء يخصّ التصدير.

---

## الخطة على 5 خطوات

### الخطوة 1 — هيكل الصفحة الجديدة `ExportCenterPage`
- ملف جديد `src/components/settings/ExportCenter/ExportCenterPage.tsx`
- استخدام `Tabs` داخلي (shadcn) بأربعة أقسام جانبية RTL:
  1. **محرك PDF** — auto / on / off + اختيار الخط (Cairo/Amiri) + معاينة فورية
  2. **تنسيقات التصدير** — افتراضي Excel/CSV، فاصل، ترميز UTF-8 BOM، اللغة (ar/en)
  3. **النسخ الاحتياطي** — تضمين مكوّن `BackupTab` الموجود
  4. **مهام التصدير الخلفية** — جدول مختصر للمهام الأخيرة (آخر 10) + رابط للوحة الكاملة `/dev/pdf-jobs` (للمطوّر فقط)
- بطاقة KPI علوية: عدد التصديرات اليوم / نسبة النجاح / متوسط الزمن (من `telemetrySink`)
- زر «إعادة تعيين الكل إلى الافتراضي»

### الخطوة 2 — Hook موحّد للإعدادات `useExportSettings`
- ملف جديد `src/hooks/useExportSettings.ts`
- يقرأ/يكتب 6 مفاتيح localStorage تحت namespace `export_*`:
  - `export_pdf_engine` (auto|on|off) — يطابق `pdf_engine_v2`
  - `export_pdf_font` (cairo|amiri) — يطابق `pdf_font` ويزامن مع `company_settings.pdf_font`
  - `export_default_format` (xlsx|csv|pdf)
  - `export_csv_delimiter` (,|;|\t)
  - `export_include_bom` (boolean)
  - `export_language` (ar|en)
- يبثّ تغييرات عبر `window.dispatchEvent('export-settings-changed')` ليلتقطها `routePdfRequest` و `customerExcelExport`
- اختبار `useExportSettings.test.ts` (4-6 حالات)

### الخطوة 3 — قسم «تنسيقات التصدير» (المكوّن الجديد الوحيد)
- ملف `src/components/settings/ExportCenter/FormatPreferencesSection.tsx`
- Switch + Select حقول مع توضيح أثر كل خيار بالعربية
- معاينة حيّة لصف CSV (يتغيّر مع الفاصل والترميز)
- ربط حقل «اللغة الافتراضية» بحقل `language` في رؤوس ملفات Excel الحالية في `customerExcelExport.ts`

### الخطوة 4 — دمج النواقص ضمن الصفحة
- نقل بطاقة «صحة محرك PDF» (`PdfHealthPanel` الموجودة في لوحة المسؤول) إلى تبويب «مهام التصدير» — بدون تكرار، عبر **استيراد** نفس المكوّن
- استيراد `BackupTab` و `SettingsExportImport` كما هما داخل التبويبات (دون تكرار الكود)
- إضافة قسم «حدود التصدير» (للمسؤول فقط): الحد الأقصى لصفوف Excel، حجم PDF الأقصى قبل تحويله إلى مهمة خلفية (>50 صفحة)

### الخطوة 5 — التنقّل والتنظيف
- في `SettingsNavigation.tsx`:
  - حذف التبويبات المنفصلة: `pdf-engine`, `backup`, `export`
  - إضافة تبويب واحد جديد:
    ```
    { id: 'export-center', label: 'مركز التصدير', icon: Download,
      adminOnly: false, description: 'كل ما يخص تصدير PDF و Excel والنسخ الاحتياطي',
      color: 'bg-emerald-500' }
    ```
- في `UnifiedSettingsPage.tsx`: استبدال 3 cases بـ `case 'export-center': return <ExportCenterPage />`
- لإبقاء الروابط القديمة عاملة: إعادة توجيه `?tab=pdf-engine|backup|export` → `?tab=export-center`
- تحديث `mem://pdf/font-preference` بإضافة سطر يشير إلى الموقع الجديد للضبط

---

## الملفات

**جديدة (3):**
- `src/components/settings/ExportCenter/ExportCenterPage.tsx`
- `src/components/settings/ExportCenter/FormatPreferencesSection.tsx`
- `src/hooks/useExportSettings.ts` (+ اختبار)

**معدّلة (3):**
- `src/components/settings/SettingsNavigation.tsx` (دمج 3 تبويبات في 1)
- `src/pages/settings/UnifiedSettingsPage.tsx` (تبسيط switch)
- `src/lib/exports/customerExcelExport.ts` (قراءة `useExportSettings` للفاصل/BOM/اللغة)

**ملفات تبقى بلا تغيير** (يُعاد استخدامها كـ subcomponents):
- `PdfEngineSettings.tsx`, `BackupTab.tsx`, `SettingsExportImport.tsx`, `PdfHealthPanel.tsx`

---

## معايير القبول
- تبويب واحد «مركز التصدير» في الإعدادات بدل 3
- كل التغييرات تُحفظ فوراً في localStorage وتنعكس على التصدير التالي دون إعادة تحميل
- اختبارات `useExportSettings` تمر (≥4 اختبارات جديدة)
- لا توجد قيم لون مباشرة — فقط HSL tokens
- RTL كامل + هدف لمس 44px على الموبايل
- التصدير الكبير (>50 صفحة) يُحوَّل تلقائياً إلى مهمة خلفية ويظهر في تبويب «مهام التصدير»

اعتمد الخطة لأبدأ التنفيذ بالخطوات الخمس بالترتيب.
