
# خطة الإصلاح الشاملة والمستدامة
## Comprehensive & Sustainable Fix Plan

---

## المرحلة 1: إصلاحات البنية التحتية (Infrastructure Fixes)
**الأولوية: P0 - حرجة | المدة: 4-5 ساعات**

### 1.1 إصلاح نظام الاستيراد في BackupTab.tsx

**المشكلة الجذرية:**
```typescript
// الكود الحالي (خاطئ):
const cleanedRecords = records.map((record: any) => {
  const { id, created_at, updated_at, ...rest } = record;
  return rest;  // يزيل id
});
await supabase.from(tableName).upsert(cleanedRecords, { onConflict: 'id' }); // لا يعمل!
```

**الحل المستدام:**
1. إنشاء آلية مطابقة ذكية باستخدام composite keys
2. إضافة خيارات للمستخدم: "استبدال الكل" / "دمج" / "تخطي المكررات"
3. عرض تقرير تفصيلي بعد الاستيراد

**التغييرات:**
```typescript
// src/components/settings/BackupTab.tsx
interface ImportOptions {
  mode: 'replace' | 'merge' | 'skip_duplicates';
  onConflict: string[]; // composite keys per table
}

const TABLE_MATCH_KEYS: Record<string, string[]> = {
  customers: ['name', 'phone'],
  products: ['sku', 'name'],
  invoices: ['invoice_number'],
  quotations: ['quotation_number'],
  // ... لكل جدول
};

const handleSmartImport = async (data: ImportData, options: ImportOptions) => {
  const results: ImportResult[] = [];
  
  for (const [tableName, records] of Object.entries(data)) {
    const matchKeys = TABLE_MATCH_KEYS[tableName] || ['id'];
    
    for (const record of records) {
      // البحث عن سجل مطابق
      const existing = await findMatchingRecord(tableName, record, matchKeys);
      
      if (existing) {
        if (options.mode === 'replace') {
          await updateRecord(tableName, existing.id, record);
          results.push({ table: tableName, action: 'updated', record });
        } else if (options.mode === 'merge') {
          await mergeRecord(tableName, existing.id, record);
          results.push({ table: tableName, action: 'merged', record });
        }
        // skip_duplicates = لا شيء
      } else {
        await insertRecord(tableName, record);
        results.push({ table: tableName, action: 'inserted', record });
      }
    }
  }
  
  return results;
};
```

**واجهة المستخدم الجديدة:**
- إضافة Dialog لاختيار نمط الاستيراد
- عرض ملخص قبل التنفيذ (سجلات جديدة / محدثة / متجاهلة)
- عرض تقرير نهائي مفصل

---

### 1.2 تحسين نظام معالجة الأخطاء (Enhanced Error Handler)

**المشكلة:** رسالة "حدث خطأ" عامة جداً ولا تساعد المستخدم

**الحل المستدام - إنشاء نظام أخطاء متعدد المستويات:**

```typescript
// src/lib/errorHandler.ts (محسّن)

interface ContextualError {
  userMessage: string;      // رسالة للمستخدم
  field?: string;           // الحقل المرتبط
  action?: string;          // الإجراء المقترح
  errorCode?: string;       // كود للتتبع
}

// خريطة أخطاء محسّنة مع سياق
const CONTEXTUAL_ERROR_MAP: Record<string, ContextualError> = {
  '23505': {
    userMessage: 'هذا السجل موجود بالفعل',
    action: 'تحقق من البيانات المدخلة أو عدّل السجل الموجود',
  },
  '23503': {
    userMessage: 'لا يمكن حذف هذا السجل',
    action: 'يجب حذف السجلات المرتبطة أولاً',
  },
  '23502': {
    userMessage: 'يوجد حقل مطلوب فارغ',
    action: 'يرجى ملء جميع الحقول المطلوبة (*)',
  },
  // ... المزيد
};

// دالة محسّنة مع سياق العملية
export function getDetailedErrorMessage(
  error: unknown, 
  context?: { operation?: string; entity?: string }
): ContextualError {
  // تحليل الخطأ واستخراج تفاصيل
  const baseError = parseError(error);
  
  // إضافة سياق العملية
  if (context?.entity) {
    baseError.userMessage = baseError.userMessage.replace(
      'السجل', 
      context.entity
    );
  }
  
  return baseError;
}

// دالة مساعدة للاستخدام في mutations
export function handleMutationErrorWithContext(
  error: unknown,
  toast: ToastFunction,
  context: { operation: string; entity: string }
): void {
  const errorInfo = getDetailedErrorMessage(error, context);
  
  toast({
    title: `خطأ في ${context.operation} ${context.entity}`,
    description: (
      <div className="space-y-1">
        <p>{errorInfo.userMessage}</p>
        {errorInfo.action && (
          <p className="text-xs text-muted-foreground">
            💡 {errorInfo.action}
          </p>
        )}
      </div>
    ),
    variant: 'destructive',
  });
}
```

**التطبيق في الملفات (12 ملف يحتاج تحديث):**
| الملف | التغيير المطلوب |
|-------|----------------|
| ExpenseFormDialog.tsx | استخدام `handleMutationErrorWithContext` |
| CashRegisterFormDialog.tsx | استخدام `handleMutationErrorWithContext` |
| CashTransactionDialog.tsx | استخدام `handleMutationErrorWithContext` |
| CategoriesPage.tsx | استخدام `getSafeErrorMessage` |
| ExpenseCategoryFormDialog.tsx | استخدام `getSafeErrorMessage` |
| ExpensesPage.tsx | استخدام `getSafeErrorMessage` |
| AccountFormDialog.tsx | استخدام `getSafeErrorMessage` |
| JournalFormDialog.tsx | استخدام `getSafeErrorMessage` |
| JournalDetailDialog.tsx | استخدام `getSafeErrorMessage` |
| TwoFactorSetup.tsx | استخدام `getSafeErrorMessage` |
| InvoiceApprovalDialog.tsx | استخدام `getSafeErrorMessage` |
| Auth.tsx | تحسين رسائل المصادقة |

---

## المرحلة 2: إصلاحات React والأداء
**الأولوية: P0/P1 | المدة: 3-4 ساعات**

### 2.1 إصلاح تحذيرات forwardRef

**الملفات المتأثرة:**
- `src/components/layout/MobileDrawer.tsx`
- `src/components/ui/sheet.tsx`

**الحل:**

```typescript
// MobileDrawer.tsx - تحديث
const MobileDrawer = forwardRef<HTMLDivElement, MobileDrawerProps>(
  function MobileDrawer({ open, onOpenChange, isDark, onThemeToggle }, ref) {
    // ... الكود الحالي
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[280px] p-0" ref={ref}>
          {/* ... */}
        </SheetContent>
      </Sheet>
    );
  }
);
MobileDrawer.displayName = 'MobileDrawer';

export default MobileDrawer;
```

### 2.2 تحسين الأداء الأولي

**المشكلة:** FCP > 6 ثواني

**الحلول:**
1. **تأخير تحميل المكونات الثقيلة:**
```typescript
// src/App.tsx
const ReportsPage = lazy(() => import('./pages/reports/ReportsPage'));
const ChartOfAccountsPage = lazy(() => import('./pages/accounting/ChartOfAccountsPage'));
```

2. **تحسين prefetch:**
```typescript
// src/lib/prefetch.ts
export const prefetchCriticalRoutes = () => {
  // تأخير prefetch للصفحات الثانوية
  setTimeout(() => {
    prefetchRoute('/customers');
    prefetchRoute('/products');
  }, 3000); // بعد التحميل الأولي
};
```

3. **تحسين CSS الحرج:**
```html
<!-- index.html -->
<link rel="preload" href="/fonts/Tajawal.woff2" as="font" crossorigin>
<style>/* Critical CSS inline */</style>
```

---

## المرحلة 3: تحسين واجهات النماذج (Responsive Forms)
**الأولوية: P1 | المدة: 5-6 ساعات**

### 3.1 إنشاء مكون جدول منتجات متجاوب

**المشكلة:** جداول المنتجات في الفواتير/عروض الأسعار لا تعمل على الموبايل

**الحل المستدام - مكون موحد:**

```typescript
// src/components/shared/ResponsiveItemsTable.tsx
interface ItemRow {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  total_price: number;
}

interface ResponsiveItemsTableProps {
  items: ItemRow[];
  products: Product[];
  onUpdateItem: (index: number, field: keyof ItemRow, value: any) => void;
  onRemoveItem: (index: number) => void;
  onAddItem: () => void;
}

export function ResponsiveItemsTable({
  items,
  products,
  onUpdateItem,
  onRemoveItem,
  onAddItem,
}: ResponsiveItemsTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <Label>المنتجات ({items.length})</Label>
          <Button variant="outline" size="sm" onClick={onAddItem}>
            <Plus className="h-4 w-4 ml-1" />
            إضافة
          </Button>
        </div>
        
        {items.map((item, index) => (
          <Card key={index} className="p-3">
            <div className="space-y-3">
              {/* Product Select - Full Width */}
              <Select
                value={item.product_id}
                onValueChange={(v) => onUpdateItem(index, 'product_id', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Quantity & Price Row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs">الكمية</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => onUpdateItem(index, 'quantity', +e.target.value || 1)}
                  />
                </div>
                <div>
                  <Label className="text-xs">السعر</Label>
                  <Input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => onUpdateItem(index, 'unit_price', +e.target.value || 0)}
                  />
                </div>
              </div>

              {/* Discount & Total Row */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">خصم %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="w-16"
                    value={item.discount_percentage}
                    onChange={(e) => onUpdateItem(index, 'discount_percentage', +e.target.value || 0)}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-lg">
                    {item.total_price.toLocaleString()} ج.م
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => onRemoveItem(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {items.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            لا توجد منتجات - اضغط على "إضافة"
          </div>
        )}
      </div>
    );
  }

  // Desktop: استخدام الجدول الحالي
  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        {/* ... الكود الحالي للجدول ... */}
      </Table>
    </div>
  );
}
```

### 3.2 تحديث نماذج الفواتير

**الملفات المتأثرة:**
- `InvoiceFormDialog.tsx`
- `QuotationFormDialog.tsx`
- `SalesOrderFormDialog.tsx`
- `PurchaseOrderFormDialog.tsx`

**التغييرات:**
1. استخدام `ResponsiveItemsTable` بدلاً من الجدول المباشر
2. تحسين Dialog size للموبايل:
```typescript
<DialogContent className="max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
```

3. إضافة scroll indicator للجداول الكبيرة

---

## المرحلة 4: إضافة Validation للبنود
**الأولوية: P1 | المدة: 2-3 ساعات**

### 4.1 إنشاء schema موحد للبنود

```typescript
// src/lib/validations.ts (إضافات)

export const documentItemSchema = z.object({
  product_id: z.string().min(1, 'يجب اختيار منتج'),
  quantity: z.number()
    .min(1, 'الكمية يجب أن تكون 1 على الأقل')
    .max(100000, 'الكمية كبيرة جداً'),
  unit_price: z.number()
    .min(0, 'السعر لا يمكن أن يكون سالباً')
    .max(10000000, 'السعر كبير جداً'),
  discount_percentage: z.number()
    .min(0, 'الخصم لا يمكن أن يكون سالباً')
    .max(100, 'الخصم لا يمكن أن يتجاوز 100%'),
});

export function validateDocumentItems(items: unknown[]): ValidationResult {
  const errors: ItemValidationError[] = [];
  
  items.forEach((item, index) => {
    const result = documentItemSchema.safeParse(item);
    if (!result.success) {
      errors.push({
        index,
        field: result.error.issues[0].path[0] as string,
        message: result.error.issues[0].message,
      });
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
```

### 4.2 تطبيق Validation في النماذج

```typescript
// في كل نموذج (Quotation, SalesOrder, PurchaseOrder)
const mutation = useMutation({
  mutationFn: async (data: FormData) => {
    // Validate items first
    const itemsValidation = validateDocumentItems(items);
    if (!itemsValidation.valid) {
      const firstError = itemsValidation.errors[0];
      throw new Error(`خطأ في الصف ${firstError.index + 1}: ${firstError.message}`);
    }
    
    // ... باقي الكود
  },
});
```

---

## المرحلة 5: تحسينات إضافية (Polish)
**الأولوية: P2 | المدة: 2-3 ساعات**

### 5.1 إضافة تأكيد قبل حذف المفضلات

```typescript
// MobileDrawer.tsx
const handleRemoveFavorite = (href: string) => {
  if (window.confirm('هل تريد إزالة هذه الصفحة من المفضلة؟')) {
    removeFavorite(href);
    haptics.medium();
  }
};
```

### 5.2 توحيد تنسيق التاريخ

```typescript
// src/lib/dateFormatter.ts
export function formatDate(date: string | Date, options?: FormatOptions): string {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ar });
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ar });
}
```

### 5.3 إضافة فحص الاتصال

```typescript
// src/hooks/useNetworkAwareSubmit.ts
export function useNetworkAwareSubmit<T>(
  submitFn: () => Promise<T>,
  options?: { offlineMessage?: string }
) {
  const isOnline = useOnlineStatus();
  
  const submit = async () => {
    if (!isOnline) {
      toast.warning(options?.offlineMessage || 'لا يوجد اتصال بالإنترنت');
      return null;
    }
    return submitFn();
  };
  
  return { submit, isOnline };
}
```

---

## ملخص الملفات المتأثرة

### ملفات جديدة (4):
```
src/components/shared/ResponsiveItemsTable.tsx
src/lib/dateFormatter.ts
src/hooks/useNetworkAwareSubmit.ts
src/components/settings/ImportOptionsDialog.tsx
```

### ملفات معدّلة (18):
```
src/components/settings/BackupTab.tsx          (إصلاح جذري)
src/lib/errorHandler.ts                        (تحسين شامل)
src/components/layout/MobileDrawer.tsx         (إصلاح forwardRef)
src/components/ui/sheet.tsx                    (إصلاح forwardRef)
src/components/invoices/InvoiceFormDialog.tsx  (responsive + validation)
src/components/quotations/QuotationFormDialog.tsx
src/components/sales-orders/SalesOrderFormDialog.tsx
src/components/purchase-orders/PurchaseOrderFormDialog.tsx
src/components/expenses/ExpenseFormDialog.tsx  (error handling)
src/components/expenses/ExpenseCategoryFormDialog.tsx
src/components/treasury/CashRegisterFormDialog.tsx
src/components/treasury/CashTransactionDialog.tsx
src/pages/categories/CategoriesPage.tsx
src/pages/expenses/ExpensesPage.tsx
src/components/accounting/AccountFormDialog.tsx
src/components/accounting/JournalFormDialog.tsx
src/components/auth/TwoFactorSetup.tsx
src/lib/validations.ts                         (إضافات)
```

---

## جدول التنفيذ

| المرحلة | المهام | المدة | الأولوية |
|---------|--------|-------|----------|
| 1.1 | إصلاح BackupTab (استيراد ذكي) | 2 ساعات | P0 |
| 1.2 | تحسين errorHandler | 2 ساعات | P0 |
| 2.1 | إصلاح forwardRef warnings | 1 ساعة | P0 |
| 2.2 | تحسين الأداء الأولي | 2 ساعات | P1 |
| 3.1 | إنشاء ResponsiveItemsTable | 2 ساعات | P1 |
| 3.2 | تحديث 4 نماذج | 3 ساعات | P1 |
| 4.1 | إضافة validation schema | 1 ساعة | P1 |
| 4.2 | تطبيق validation | 1 ساعة | P1 |
| 5.x | تحسينات إضافية | 2 ساعات | P2 |
| **الإجمالي** | | **16-18 ساعة** | |

---

## معايير النجاح

| المعيار | الهدف |
|---------|-------|
| استيراد النسخ الاحتياطية | 0 سجلات مكررة |
| رسائل الخطأ | تحتوي على سياق وإجراء مقترح |
| تحذيرات React Console | 0 تحذيرات |
| FCP (First Contentful Paint) | < 2.5 ثانية |
| نماذج الموبايل | قابلة للاستخدام 100% |
| أخطاء error.message المكشوفة | 0 |

---

## الاستدامة المستقبلية

### قواعد الكود الجديدة:
1. **كل `onError` جديد** يجب أن يستخدم `getSafeErrorMessage` أو `handleMutationErrorWithContext`
2. **كل نموذج بنود** يستخدم `ResponsiveItemsTable`
3. **كل تاريخ** يستخدم `formatDate` من `dateFormatter.ts`
4. **كل عملية شبكة حرجة** تستخدم `useNetworkAwareSubmit`

### ESLint Rules المقترحة:
```javascript
// eslint.config.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: "MemberExpression[property.name='message'][object.name='error']",
      message: "Use getSafeErrorMessage(error) instead of error.message",
    },
  ],
}
```
