
# 🚀 خطة تحديث PWA إلى أحدث إصدار
## PWA Enhancement Plan - Version 2.0.0

---

## 📊 تحليل الوضع الحالي

### الإصدار الحالي
| العنصر | الحالة |
|--------|--------|
| vite-plugin-pwa | ^1.2.0 ✅ أحدث إصدار |
| Workbox | 7.3.0 (تلقائي) |
| registerType | autoUpdate ✅ |
| Service Worker Strategy | generateSW |

### الميزات الموجودة
- ✅ manifest أساسي مع shortcuts
- ✅ أيقونات بجميع الأحجام
- ✅ صفحة offline.html
- ✅ ReloadPrompt للتحديثات
- ✅ useInstallPrompt hook
- ✅ صفحة /install للتثبيت

### الميزات المفقودة (PWA 2025)
- ❌ `display_override` للتحكم بوضع العرض
- ❌ `share_target` لاستقبال المشاركات
- ❌ `file_handlers` لفتح الملفات
- ❌ `launch_handler` للتحكم بالتشغيل
- ❌ `protocol_handlers` للبروتوكولات المخصصة
- ❌ `handle_links` لمعالجة الروابط
- ❌ `edge_side_panel` لـ Edge
- ❌ Screenshots بجميع الأحجام
- ❌ `related_applications` للتطبيقات المرتبطة
- ❌ `scope_extensions` للنطاقات

---

## 🎯 المهام المطلوبة

### المرحلة 1: تحديث Manifest المتقدم
**الملف**: `vite.config.ts`

#### 1.1 إضافة display_override
```typescript
display_override: ['standalone', 'minimal-ui', 'window-controls-overlay'],
```
هذا يسمح للتطبيق باستخدام أوضاع عرض متعددة حسب دعم المتصفح.

#### 1.2 إضافة launch_handler
```typescript
launch_handler: {
  client_mode: ['navigate-existing', 'auto']
},
```
يتحكم في كيفية تشغيل التطبيق عند النقر على إشعار أو رابط.

#### 1.3 إضافة share_target
```typescript
share_target: {
  action: '/share-target',
  method: 'POST',
  enctype: 'multipart/form-data',
  params: {
    title: 'title',
    text: 'text',
    url: 'url',
    files: [
      {
        name: 'files',
        accept: ['image/*', 'application/pdf', '.xlsx', '.csv']
      }
    ]
  }
},
```
يسمح للمستخدمين بمشاركة الملفات والنصوص مع التطبيق مباشرة.

#### 1.4 إضافة file_handlers
```typescript
file_handlers: [
  {
    action: '/open-file',
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls', '.xlsx'],
      'text/csv': ['.csv'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp']
    }
  }
],
```
يسمح للتطبيق بفتح أنواع معينة من الملفات.

#### 1.5 إضافة protocol_handlers
```typescript
protocol_handlers: [
  {
    protocol: 'web+erp',
    url: '/protocol?action=%s'
  },
  {
    protocol: 'web+invoice',
    url: '/invoices?number=%s'
  },
  {
    protocol: 'web+customer',
    url: '/customers?id=%s'
  }
],
```
يسمح بفتح التطبيق عبر روابط مخصصة مثل `web+invoice://INV-001`.

#### 1.6 إضافة handle_links
```typescript
handle_links: 'preferred',
```
يجعل التطبيق المثبت يفتح الروابط تلقائياً.

#### 1.7 تحسين Screenshots
```typescript
screenshots: [
  {
    src: '/screenshots/dashboard-wide.png',
    sizes: '1280x720',
    type: 'image/png',
    form_factor: 'wide',
    label: 'لوحة التحكم الرئيسية'
  },
  {
    src: '/screenshots/dashboard-narrow.png',
    sizes: '750x1334',
    type: 'image/png',
    form_factor: 'narrow',
    label: 'التطبيق على الهاتف'
  }
],
```

#### 1.8 إضافة edge_side_panel
```typescript
edge_side_panel: {
  preferred_width: 400
},
```
يتيح فتح التطبيق في اللوحة الجانبية لـ Microsoft Edge.

---

### المرحلة 2: إنشاء صفحات معالجة جديدة
**ملفات جديدة**:

#### 2.1 صفحة Share Target
**الملف**: `src/pages/share/ShareTargetPage.tsx`
- استقبال الملفات والنصوص المشاركة
- معالجة المرفقات تلقائياً
- توجيه المستخدم للصفحة المناسبة

#### 2.2 صفحة File Handler
**الملف**: `src/pages/file/OpenFilePage.tsx`
- فتح الملفات المدعومة
- عرض محتوى الملفات
- استيراد البيانات من Excel/CSV

#### 2.3 صفحة Protocol Handler
**الملف**: `src/pages/protocol/ProtocolHandlerPage.tsx`
- معالجة البروتوكولات المخصصة
- التوجيه للصفحة المناسبة حسب البروتوكول

---

### المرحلة 3: تحسين Service Worker
**الملف**: `vite.config.ts` → workbox

#### 3.1 إضافة Background Sync
```typescript
workbox: {
  // ... الإعدادات الحالية
  skipWaiting: true,
  clientsClaim: true,
  // تحسين التخزين المؤقت
  runtimeCaching: [
    // ... الإعدادات الحالية
    {
      // تخزين الخطوط المحلية
      urlPattern: /\.(?:woff2?)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'fonts-cache-v2',
        expiration: {
          maxAgeSeconds: 365 * 24 * 60 * 60
        }
      }
    },
    {
      // تخزين الـ API بشكل أذكى
      urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache-v2',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 10 * 60
        },
        networkTimeoutSeconds: 10,
        cacheableResponse: {
          statuses: [0, 200]
        }
      }
    }
  ],
  navigateFallback: '/offline.html',
  navigateFallbackDenylist: [/^\/api/, /^\/auth/]
}
```

---

### المرحلة 4: تحديث Hooks
**الملف**: `src/hooks/useInstallPrompt.ts`

#### 4.1 إضافة دعم Launch Queue API
```typescript
// دعم Launch Queue للتطبيقات المثبتة
useEffect(() => {
  if ('launchQueue' in window) {
    window.launchQueue.setConsumer((launchParams) => {
      if (launchParams.files?.length) {
        // معالجة الملفات المفتوحة
        handleLaunchFiles(launchParams.files);
      }
      if (launchParams.targetURL) {
        // التوجيه للرابط المطلوب
        navigate(launchParams.targetURL);
      }
    });
  }
}, []);
```

#### 4.2 إنشاء hook جديد للـ File Handling
**الملف الجديد**: `src/hooks/useFileHandling.ts`
```typescript
export function useFileHandling() {
  // التعامل مع الملفات المفتوحة
  // دعم Launch Queue API
  // معالجة share_target
}
```

---

### المرحلة 5: تحديث offline.html
**الملف**: `public/offline.html`

#### التحسينات:
- إضافة Service Worker status check
- عرض البيانات المخزنة محلياً
- زر للعمل في وضع offline
- تحسين التصميم

---

### المرحلة 6: تحديث ReloadPrompt
**الملف**: `src/components/offline/ReloadPrompt.tsx`

#### التحسينات:
- إضافة تفاصيل التحديث (رقم الإصدار)
- دعم Background Update
- إشعار ذكي عند وجود تحديث
- تحسين UX للتحديث

---

### المرحلة 7: إضافة App Badge API
**الملف الجديد**: `src/hooks/useAppBadge.ts`

```typescript
export function useAppBadge() {
  const setBadge = async (count: number) => {
    if ('setAppBadge' in navigator) {
      await navigator.setAppBadge(count);
    }
  };
  
  const clearBadge = async () => {
    if ('clearAppBadge' in navigator) {
      await navigator.clearAppBadge();
    }
  };
  
  return { setBadge, clearBadge };
}
```
يسمح بعرض عداد الإشعارات على أيقونة التطبيق.

---

### المرحلة 8: تحسين صفحة التثبيت
**الملف**: `src/pages/install/InstallPage.tsx`

#### التحسينات:
- عرض حجم التطبيق التقريبي
- معلومات عن الأذونات المطلوبة
- شرح ميزات PWA 2025 الجديدة
- تحسين تعليمات iOS 17+

---

## 📁 ملخص الملفات

### ملفات تحتاج تعديل
| الملف | نوع التغيير |
|-------|-------------|
| `vite.config.ts` | تحديث manifest شامل |
| `public/offline.html` | تحسين التصميم والوظائف |
| `src/hooks/useInstallPrompt.ts` | إضافة Launch Queue |
| `src/components/offline/ReloadPrompt.tsx` | تحسين UX |
| `src/pages/install/InstallPage.tsx` | تحديث المعلومات |
| `src/App.tsx` | إضافة routes جديدة |

### ملفات جديدة
| الملف | الوصف |
|-------|-------|
| `src/pages/share/ShareTargetPage.tsx` | معالجة المشاركات |
| `src/pages/file/OpenFilePage.tsx` | فتح الملفات |
| `src/pages/protocol/ProtocolHandlerPage.tsx` | البروتوكولات |
| `src/hooks/useFileHandling.ts` | التعامل مع الملفات |
| `src/hooks/useAppBadge.ts` | App Badge API |
| `src/hooks/useLaunchQueue.ts` | Launch Queue API |

---

## 📋 ترتيب التنفيذ

```text
1. تحديث manifest في vite.config.ts        [15 دقيقة]
2. إنشاء ShareTargetPage.tsx               [10 دقائق]
3. إنشاء OpenFilePage.tsx                  [10 دقائق]
4. إنشاء ProtocolHandlerPage.tsx           [5 دقائق]
5. إنشاء useFileHandling.ts                [10 دقائق]
6. إنشاء useAppBadge.ts                    [5 دقائق]
7. إنشاء useLaunchQueue.ts                 [5 دقائق]
8. تحديث useInstallPrompt.ts               [5 دقائق]
9. تحديث ReloadPrompt.tsx                  [10 دقائق]
10. تحديث offline.html                     [10 دقائق]
11. تحديث InstallPage.tsx                  [10 دقائق]
12. تحديث App.tsx (routes)                 [5 دقائق]
```

**إجمالي الوقت المقدر: ~100 دقيقة**

---

## ✅ معايير القبول

| المعيار | الهدف |
|---------|-------|
| Lighthouse PWA | 100/100 |
| share_target | يعمل على Chrome/Edge |
| file_handlers | مسجل في النظام |
| protocol_handlers | يفتح الروابط المخصصة |
| App Badge | يعرض العداد |
| Background Sync | يعمل |
| Offline | كامل الوظائف |

---

## 🆕 ميزات PWA 2025 المضافة

| الميزة | الدعم | الوصف |
|--------|-------|-------|
| `display_override` | Chrome/Edge | أوضاع عرض متعددة |
| `share_target` | Chrome/Edge/Samsung | استقبال المشاركات |
| `file_handlers` | Chrome/Edge | فتح الملفات |
| `protocol_handlers` | Chrome/Edge | روابط مخصصة |
| `launch_handler` | Chrome/Edge | تحكم بالتشغيل |
| `handle_links` | Chrome | فتح الروابط تلقائياً |
| `edge_side_panel` | Edge | اللوحة الجانبية |
| App Badge API | Chrome/Edge | عداد الأيقونة |
| Launch Queue API | Chrome/Edge | معالجة الملفات |

---

## 🧪 خطة الاختبار

1. **اختبار التثبيت**: التحقق من ظهور جميع الميزات في Chrome DevTools
2. **اختبار share_target**: مشاركة صورة/نص من تطبيق آخر
3. **اختبار file_handlers**: فتح ملف Excel من مدير الملفات
4. **اختبار protocol_handlers**: فتح رابط `web+invoice://INV-001`
5. **اختبار App Badge**: عرض عداد الإشعارات
6. **اختبار Offline**: التحقق من العمل بدون اتصال
