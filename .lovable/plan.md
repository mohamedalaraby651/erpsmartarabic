

# إصلاح مشكلة المعاينة والوصول

## المشكلة
المعاينة تفتح على المسار `/index` لكن الراوتر لا يعرف هذا المسار، فيعرض صفحة "غير موجود" (NotFound) بدلاً من صفحة تسجيل الدخول أو الداشبورد.

## الحل

### ملف واحد: `src/App.tsx`

إضافة `Navigate` redirect من `/index` إلى `/`:

```tsx
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

// داخل Routes، قبل Route path="*":
<Route path="/index" element={<Navigate to="/" replace />} />
```

هذا سيضمن أن أي زيارة لـ `/index` تُحوّل تلقائياً إلى `/` حيث يعمل `AppLayout` ويتحقق من تسجيل الدخول.

### التأثير
- المعاينة ستعمل فوراً بدل عرض صفحة 404
- المستخدم سيُحوّل لصفحة تسجيل الدخول إن