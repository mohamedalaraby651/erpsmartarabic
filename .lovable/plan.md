
# 📱 خطة تطوير قسم تجربة المستخدم والأداء
## UX & Performance Enhancement Plan - Version 2.0

---

## 📊 تقييم الوضع الحالي

### الأصول الموجودة حالياً

| الفئة | المكونات | الحالة |
|-------|----------|--------|
| **Mobile Components** | 11 مكون | ✅ موجود |
| **Offline Support** | 4 hooks + IndexedDB | ✅ موجود |
| **PWA** | manifest + Service Worker | ✅ موجود |
| **Performance Hooks** | useVirtualList, useInfiniteScroll | ✅ موجود |
| **Animations** | 15+ CSS animation | ✅ موجود |
| **Keyboard Shortcuts** | 7 shortcuts | ✅ موجود |
| **Haptic Feedback** | 6 patterns | ✅ موجود |

### المكونات الموجودة بالتفصيل

```text
src/components/mobile/
├── DataCard.tsx          # بطاقات البيانات للموبايل
├── FABMenu.tsx           # زر العمل العائم السياقي
├── FloatingActionButton.tsx
├── FullScreenForm.tsx    # نماذج ملء الشاشة
├── LongPressMenu.tsx     # قائمة الضغط الطويل
├── MobileListItem.tsx    # عناصر القوائم
├── MobileListSkeleton.tsx
├── MobileSearchBar.tsx   # شريط البحث للموبايل
├── MobileSkeleton.tsx
├── PullToRefresh.tsx     # السحب للتحديث ✓
├── SwipeableRow.tsx      # السحب للتعديل/الحذف

src/components/offline/
├── OfflineIndicator.tsx  # مؤشر حالة الاتصال
└── ReloadPrompt.tsx      # تحديث التطبيق

src/hooks/
├── useInfiniteScroll.ts  # التمرير اللانهائي
├── useVirtualList.ts     # القوائم الافتراضية
├── useOfflineSync.ts     # مزامنة البيانات
├── useOnlineStatus.ts    # حالة الاتصال
├── useInstallPrompt.ts   # تثبيت PWA
├── useKeyboardShortcuts.ts
├── useLongPress.ts
├── useDoubleTap.ts
└── use-mobile.tsx        # اكتشاف الجهاز
```

### نقاط القوة الحالية
- ✅ دعم PWA كامل مع manifest وأيقونات متعددة الأحجام
- ✅ Service Worker مع استراتيجيات تخزين مؤقت متقدمة
- ✅ Lazy loading لجميع الصفحات (57 صفحة)
- ✅ React Query مع staleTime و gcTime محسّنة
- ✅ تخزين IndexedDB للعمل بدون اتصال
- ✅ Haptic feedback للتفاعلات اللمسية

### الفجوات والتحسينات المطلوبة
- ⚠️ عدم وجود قياس حقيقي لـ Core Web Vitals
- ⚠️ عدم وجود Push Notifications
- ⚠️ عدم وجود صفحة Error Boundary مخصصة
- ⚠️ البحث يتطلب حرفين قبل البدء
- ⚠️ عدم وجود Voice Search
- ⚠️ عدم وجود تخصيص Shortcuts من المستخدم
- ⚠️ حجم الحزمة قد يكون كبيراً (يحتاج قياس)

---

## 🎯 أهداف التطوير

### الأهداف القابلة للقياس

| المقياس | الحالي (تقديري) | المستهدف |
|---------|-----------------|----------|
| First Contentful Paint | ~2.5s | < 1.5s |
| Largest Contentful Paint | ~4s | < 2.5s |
| Time to Interactive | ~4s | < 3s |
| Bundle Size (Initial) | ~800KB | < 400KB |
| Lighthouse Performance | ~70 | > 90 |
| Lighthouse PWA | ~80 | 100 |
| Offline Capability | جزئي | كامل |

---

## 📋 المراحل التفصيلية

### المرحلة 1: قياس وتحليل الأداء الحالي 
**المدة: يوم واحد | الأولوية: P0**

#### المهام:
1. **إضافة أدوات قياس الأداء**
   - إنشاء `src/lib/performanceMonitor.ts`
   - قياس FCP, LCP, CLS, FID
   - إرسال المقاييس للـ Console أو Analytics

2. **تحليل حجم الحزمة**
   - تحديث `vite.config.ts` لإضافة تحليل الحزمة
   - إنشاء تقرير Bundle Analysis
   - تحديد المكتبات الأكبر حجماً

3. **إنشاء Dashboard للأداء**
   - صفحة `/admin/performance` (اختياري)
   - عرض المقاييس في الوقت الفعلي

#### الملفات الجديدة:
```text
src/lib/performanceMonitor.ts
src/hooks/usePerformanceMetrics.ts
```

#### الكود المقترح:
```typescript
// src/lib/performanceMonitor.ts
export const measureWebVitals = () => {
  if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
    // FCP
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        console.log('[Performance] FCP:', entry.startTime);
      }
    }).observe({ entryTypes: ['paint'] });

    // LCP
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      console.log('[Performance] LCP:', entries[entries.length - 1].startTime);
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // CLS
    let clsValue = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (!(entry as any).hadRecentInput) {
          clsValue += (entry as any).value;
        }
      }
      console.log('[Performance] CLS:', clsValue);
    }).observe({ entryTypes: ['layout-shift'] });
  }
};
```

---

### المرحلة 2: تحسين حجم الحزمة (Bundle Optimization)
**المدة: 3 أيام | الأولوية: P0**

#### المهام:

1. **Code Splitting المتقدم**
   - فصل مكتبات UI الكبيرة
   - فصل مكتبات التقارير (recharts, jspdf)
   - فصل مكتبات التواريخ (date-fns)

2. **تحديث vite.config.ts**
```typescript
// إضافة manual chunks
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-query': ['@tanstack/react-query'],
        'vendor-ui': [
          '@radix-ui/react-dialog',
          '@radix-ui/react-dropdown-menu',
          '@radix-ui/react-tabs',
          '@radix-ui/react-select',
          '@radix-ui/react-popover',
        ],
        'vendor-charts': ['recharts'],
        'vendor-pdf': ['jspdf', 'jspdf-autotable'],
        'vendor-excel': ['xlsx'],
        'vendor-dates': ['date-fns'],
        'vendor-dnd': ['@dnd-kit/core', '@dnd-kit/sortable'],
      },
    },
  },
},
```

3. **Lazy Loading للمكونات الثقيلة**
```typescript
// تحميل كسول للمكونات الثقيلة
const RechartsChart = lazy(() => import('@/components/charts/RechartsChart'));
const PDFExport = lazy(() => import('@/components/export/PDFExport'));
const ExcelExport = lazy(() => import('@/components/export/ExcelExport'));
```

4. **تحسين استيراد Lucide Icons**
```typescript
// بدلاً من
import { Home, Settings, Users } from 'lucide-react';

// استخدام استيراد محدد
import Home from 'lucide-react/dist/esm/icons/home';
import Settings from 'lucide-react/dist/esm/icons/settings';
```

#### النتائج المتوقعة:
- تقليل Initial Bundle بنسبة 40-50%
- تحسين FCP بمقدار 0.5-1 ثانية

---

### المرحلة 3: تحسين التحميل الأولي (Initial Load)
**المدة: 2 يوم | الأولوية: P0**

#### المهام:

1. **تحسين Critical CSS**
   - استخراج CSS الحرج inline
   - تأخير تحميل CSS غير الحرج

2. **تحسين الخطوط**
```html
<!-- Preload Cairo font -->
<link rel="preload" href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" as="style">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

3. **تحسين Suspense Fallbacks**
```typescript
// src/components/shared/OptimizedPageLoader.tsx
const OptimizedPageLoader = memo(() => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="text-center space-y-4">
      <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
      <p className="text-muted-foreground text-sm">جاري التحميل...</p>
    </div>
  </div>
));
```

4. **Preloading للصفحات المتوقعة**
```typescript
// src/lib/prefetch.ts
export const prefetchRoute = (routeName: string) => {
  const routes: Record<string, () => Promise<any>> = {
    dashboard: () => import('@/pages/Dashboard'),
    customers: () => import('@/pages/customers/CustomersPage'),
    products: () => import('@/pages/products/ProductsPage'),
    invoices: () => import('@/pages/invoices/InvoicesPage'),
  };
  
  if (routes[routeName]) {
    routes[routeName]();
  }
};
```

---

### المرحلة 4: تحسين تجربة Offline
**المدة: 3 أيام | الأولوية: P1**

#### المهام:

1. **توسيع IndexedDB للجداول الإضافية**
```typescript
// تحديث src/lib/offlineStorage.ts
interface OfflineDB extends DBSchema {
  customers: { key: string; value: any; indexes: { 'by-name': string } };
  products: { key: string; value: any; indexes: { 'by-name': string } };
  invoices: { key: string; value: any; indexes: { 'by-number': string } };
  quotations: { key: string; value: any; };
  suppliers: { key: string; value: any; };
  sales_orders: { key: string; value: any; };  // جديد
  purchase_orders: { key: string; value: any; };  // جديد
  payments: { key: string; value: any; };  // جديد
  expenses: { key: string; value: any; };  // جديد
  tasks: { key: string; value: any; };  // جديد
  sync_queue: { /* ... */ };
}
```

2. **تحسين استراتيجية الـ Sync**
```typescript
// src/lib/syncStrategies.ts
export const syncStrategies = {
  // البيانات الحساسة - Server-First
  payments: 'server-first',
  invoices: 'server-first',
  
  // البيانات العامة - Offline-First
  customers: 'offline-first',
  products: 'offline-first',
  
  // البيانات التعاونية - Last-Write-Wins
  tasks: 'last-write-wins',
};
```

3. **إضافة Conflict Resolution UI**
```typescript
// src/components/offline/ConflictResolver.tsx
// عرض نافذة لحل التعارضات عند وجود بيانات متضاربة
```

4. **تحسين OfflineIndicator**
   - إضافة تفاصيل أكثر عن البيانات المعلقة
   - إضافة خيار "Sync Now" مع تقدم العملية
   - إضافة إشعار عند فقدان/استعادة الاتصال

---

### المرحلة 5: Push Notifications
**المدة: 3 أيام | الأولوية: P1**

#### المهام:

1. **إنشاء Edge Function للإشعارات**
```typescript
// supabase/functions/send-push-notification/index.ts
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

Deno.serve(async (req) => {
  const { userId, title, body, data } = await req.json();
  
  // Get user's push subscription
  const supabase = createClient(/* ... */);
  const { data: subscription } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single();
  
  if (subscription) {
    await webpush.sendNotification(subscription.subscription, JSON.stringify({
      title,
      body,
      data,
    }));
  }
  
  return new Response(JSON.stringify({ success: true }));
});
```

2. **جدول قاعدة البيانات الجديد**
```sql
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own subscriptions" 
  ON push_subscriptions FOR ALL 
  USING (auth.uid() = user_id);
```

3. **Hook لإدارة الإشعارات**
```typescript
// src/hooks/usePushNotifications.ts
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  
  const requestPermission = async () => {
    const result = await Notification.requestPermission();
    setPermission(result);
    
    if (result === 'granted') {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: VAPID_PUBLIC_KEY,
      });
      
      // Save to database
      await supabase.from('push_subscriptions').upsert({
        user_id: user.id,
        subscription: sub.toJSON(),
      });
      
      setSubscription(sub);
    }
  };
  
  return { permission, subscription, requestPermission };
}
```

4. **أنواع الإشعارات المدعومة**
   - فاتورة جديدة/مدفوعة
   - مهمة مستحقة
   - انخفاض المخزون
   - طلب شراء جديد
   - تنبيهات النظام

---

### المرحلة 6: تحسين البحث الذكي
**المدة: 2 يوم | الأولوية: P1**

#### المهام:

1. **البحث الفوري (Instant Search)**
```typescript
// تحديث src/pages/search/SearchPage.tsx
// البحث يبدأ من حرف واحد بدلاً من اثنين
queryFn: async () => {
  if (!query || query.length < 1) return []; // تغيير من 2 إلى 1
  // ...
},
enabled: query.length >= 1, // تغيير من 2 إلى 1
```

2. **البحث بالصوت (Voice Search)**
```typescript
// src/hooks/useVoiceSearch.ts
export function useVoiceSearch() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  
  const startListening = () => {
    if ('webkitSpeechRecognition' in window) {
      const recognition = new webkitSpeechRecognition();
      recognition.lang = 'ar-EG';
      recognition.continuous = false;
      
      recognition.onresult = (event) => {
        const text = event.results[0][0].transcript;
        setTranscript(text);
      };
      
      recognition.start();
      setIsListening(true);
    }
  };
  
  return { isListening, transcript, startListening, stopListening };
}
```

3. **تاريخ البحث والاقتراحات**
```typescript
// src/hooks/useSearchHistory.ts
export function useSearchHistory() {
  const [history, setHistory] = useLocalStorage<string[]>('search-history', []);
  
  const addToHistory = (query: string) => {
    const updated = [query, ...history.filter(h => h !== query)].slice(0, 10);
    setHistory(updated);
  };
  
  const clearHistory = () => setHistory([]);
  
  return { history, addToHistory, clearHistory };
}
```

4. **Fuzzy Search للأخطاء الإملائية**
   - استخدام Fuse.js للبحث الضبابي
   - تصحيح الأخطاء الإملائية تلقائياً

---

### المرحلة 7: تحسينات اللمس والإيماءات
**المدة: 2 يوم | الأولوية: P2**

#### المهام:

1. **تحسين SwipeableRow**
```typescript
// إضافة إيماءات جديدة
- Swipe Left: حذف
- Swipe Right: تعديل
- Long Press: قائمة سياقية
- Double Tap: معاينة سريعة
```

2. **إضافة Gesture Navigation**
```typescript
// src/hooks/useSwipeNavigation.ts
export function useSwipeNavigation() {
  // Swipe من الحافة اليمنى = العودة للخلف
  // Swipe من الحافة اليسرى = القائمة الجانبية
}
```

3. **تحسين PullToRefresh**
   - إضافة مؤشر تقدم أفضل
   - إضافة أصوات/اهتزاز عند الانتهاء
   - دعم "Pull up to load more"

4. **Pinch to Zoom للصور والتقارير**
```typescript
// src/components/mobile/PinchZoom.tsx
export function PinchZoom({ children }: { children: React.ReactNode }) {
  // ...
}
```

---

### المرحلة 8: تخصيص اختصارات لوحة المفاتيح
**المدة: يوم واحد | الأولوية: P2**

#### المهام:

1. **إنشاء UI لتخصيص الاختصارات**
```typescript
// src/components/settings/KeyboardShortcutsSettings.tsx
// قائمة بجميع الاختصارات مع إمكانية تعديلها
```

2. **حفظ الاختصارات المخصصة**
```typescript
// src/hooks/useCustomShortcuts.ts
export function useCustomShortcuts() {
  const [shortcuts, setShortcuts] = useLocalStorage('custom-shortcuts', defaultShortcuts);
  // ...
}
```

3. **إضافة اختصارات جديدة**
| الاختصار | الوظيفة |
|----------|---------|
| Ctrl+N | إنشاء جديد (حسب الصفحة) |
| Ctrl+S | حفظ النموذج الحالي |
| Ctrl+P | طباعة |
| Ctrl+E | تصدير |
| Ctrl+F | بحث في الصفحة الحالية |
| Ctrl+, | الإعدادات |
| ? | عرض كل الاختصارات |

4. **نافذة عرض الاختصارات**
```typescript
// src/components/keyboard/ShortcutsModal.tsx
// نافذة تظهر عند الضغط على ?
```

---

### المرحلة 9: Error Boundaries المحسنة
**المدة: يوم واحد | الأولوية: P1**

#### المهام:

1. **إنشاء Error Boundary شامل**
```typescript
// src/components/errors/AppErrorBoundary.tsx
class AppErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log to monitoring service
    console.error('[ErrorBoundary]', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <Card className="max-w-md w-full text-center">
            <CardContent className="pt-8">
              <AlertTriangle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">حدث خطأ غير متوقع</h2>
              <p className="text-muted-foreground mb-4">
                نعتذر عن الإزعاج. يرجى تحديث الصفحة أو العودة للرئيسية.
              </p>
              <div className="flex gap-2 justify-center">
                <Button onClick={() => window.location.reload()}>
                  تحديث الصفحة
                </Button>
                <Button variant="outline" onClick={() => window.location.href = '/'}>
                  العودة للرئيسية
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    return this.props.children;
  }
}
```

2. **Error Boundaries لكل قسم**
   - QueryErrorResetBoundary للـ React Query
   - Suspense boundaries مع fallbacks مخصصة

---

### المرحلة 10: تحسينات CSS والتحريك
**المدة: يوم واحد | الأولوية: P2**

#### المهام:

1. **تحسين Skeleton Animations**
   - تقليل استخدام CPU للـ animations
   - استخدام GPU acceleration

2. **إضافة Micro-interactions**
```css
/* Button hover effects */
.button-hover-lift {
  transition: transform 0.2s, box-shadow 0.2s;
}
.button-hover-lift:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

/* Card selection effect */
.card-selected {
  ring: 2px;
  ring-color: hsl(var(--primary));
  animation: pulse-ring 0.3s ease-out;
}
```

3. **تحسين Page Transitions**
```typescript
// src/components/transitions/PageTransition.tsx
export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
    >
      {children}
    </motion.div>
  );
}
```

---

## 📊 ملخص المراحل والأولويات

| # | المرحلة | المدة | الأولوية | التأثير |
|---|---------|-------|----------|---------|
| 1 | قياس الأداء | 1 يوم | P0 | 🎯 أساسي |
| 2 | تحسين Bundle | 3 أيام | P0 | 🚀 عالي |
| 3 | تحسين التحميل | 2 يوم | P0 | 🚀 عالي |
| 4 | تحسين Offline | 3 أيام | P1 | 📱 متوسط-عالي |
| 5 | Push Notifications | 3 أيام | P1 | 📱 متوسط-عالي |
| 6 | البحث الذكي | 2 يوم | P1 | 💡 متوسط |
| 7 | تحسين اللمس | 2 يوم | P2 | 📱 متوسط |
| 8 | اختصارات لوحة المفاتيح | 1 يوم | P2 | 💡 منخفض |
| 9 | Error Boundaries | 1 يوم | P1 | 🔧 متوسط |
| 10 | تحسينات CSS | 1 يوم | P2 | ✨ منخفض |

**المجموع: 19 يوم عمل (~4 أسابيع)**

---

## 📁 الملفات الجديدة المطلوبة

```text
src/lib/
├── performanceMonitor.ts       # قياس Core Web Vitals
├── prefetch.ts                 # Preloading للصفحات
├── syncStrategies.ts           # استراتيجيات المزامنة

src/hooks/
├── usePerformanceMetrics.ts    # Hook لمقاييس الأداء
├── usePushNotifications.ts     # إدارة الإشعارات
├── useVoiceSearch.ts           # البحث الصوتي
├── useSearchHistory.ts         # تاريخ البحث
├── useSwipeNavigation.ts       # التنقل بالسحب
├── useCustomShortcuts.ts       # اختصارات مخصصة

src/components/
├── errors/
│   └── AppErrorBoundary.tsx    # حدود الخطأ
├── keyboard/
│   └── ShortcutsModal.tsx      # عرض الاختصارات
├── offline/
│   └── ConflictResolver.tsx    # حل التعارضات
├── mobile/
│   └── PinchZoom.tsx           # تكبير بالقرص
├── settings/
│   └── KeyboardShortcutsSettings.tsx
└── transitions/
    └── PageTransition.tsx      # انتقالات الصفحات

supabase/functions/
└── send-push-notification/
    └── index.ts               # Edge Function للإشعارات
```

---

## 🗄️ جداول قاعدة البيانات الجديدة

```sql
-- جدول اشتراكات الإشعارات
CREATE TABLE push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL,
  device_info JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- جدول تاريخ البحث (اختياري)
CREATE TABLE search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول اختصارات المستخدم المخصصة (اختياري)
CREATE TABLE user_shortcuts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  shortcuts JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

---

## ✅ معايير القبول (Acceptance Criteria)

### المرحلة 1-3 (الأداء):
- [ ] FCP < 1.8s على 3G
- [ ] LCP < 2.5s على 3G
- [ ] Initial Bundle < 500KB
- [ ] Lighthouse Performance > 85

### المرحلة 4 (Offline):
- [ ] التطبيق يعمل بالكامل بدون اتصال
- [ ] المزامنة تعمل عند استعادة الاتصال
- [ ] لا فقدان للبيانات

### المرحلة 5 (Push Notifications):
- [ ] طلب الإذن يعمل على Chrome/Firefox/Safari
- [ ] الإشعارات تصل في الخلفية
- [ ] الضغط على الإشعار يفتح الصفحة المناسبة

### المرحلة 6-10:
- [ ] البحث الصوتي يعمل باللغة العربية
- [ ] الاختصارات قابلة للتخصيص
- [ ] Error Boundaries تعمل بشكل صحيح
- [ ] الإيماءات اللمسية سلسة

---

## 🔧 التفاصيل التقنية للتنفيذ

### تحديث vite.config.ts (المرحلة 2):
```typescript
// إضافة build optimization
build: {
  rollupOptions: {
    output: {
      manualChunks: {
        'vendor-react': ['react', 'react-dom', 'react-router-dom'],
        'vendor-query': ['@tanstack/react-query'],
        'vendor-ui': [/* radix packages */],
        'vendor-charts': ['recharts'],
        'vendor-pdf': ['jspdf', 'jspdf-autotable'],
        'vendor-excel': ['xlsx'],
      },
    },
  },
  chunkSizeWarningLimit: 500,
},
```

### تحديث App.tsx (المرحلة 9):
```typescript
// إضافة Error Boundary
import { AppErrorBoundary } from '@/components/errors/AppErrorBoundary';

const App = () => (
  <AppErrorBoundary>
    <QueryClientProvider client={queryClient}>
      {/* ... */}
    </QueryClientProvider>
  </AppErrorBoundary>
);
```

### تحديث index.html (المرحلة 3):
```html
<!-- Preload critical resources -->
<link rel="preload" href="/fonts/Cairo-Regular.woff2" as="font" crossorigin>
<link rel="preconnect" href="https://npwofemokwddtutugmas.supabase.co">

<!-- Inline critical CSS -->
<style>
  /* Critical CSS for initial render */
  body { font-family: 'Cairo', sans-serif; direction: rtl; }
  .loading-spinner { /* ... */ }
</style>
```

---

## 📅 الجدول الزمني المقترح

```text
الأسبوع 1:
├── يوم 1: المرحلة 1 - قياس الأداء
├── يوم 2-4: المرحلة 2 - Bundle Optimization
└── يوم 5: المرحلة 3 - تحسين التحميل (جزء 1)

الأسبوع 2:
├── يوم 1: المرحلة 3 - تحسين التحميل (جزء 2)
├── يوم 2-4: المرحلة 4 - تحسين Offline
└── يوم 5: المرحلة 9 - Error Boundaries

الأسبوع 3:
├── يوم 1-3: المرحلة 5 - Push Notifications
└── يوم 4-5: المرحلة 6 - البحث الذكي

الأسبوع 4:
├── يوم 1-2: المرحلة 7 - تحسين اللمس
├── يوم 3: المرحلة 8 - اختصارات لوحة المفاتيح
├── يوم 4: المرحلة 10 - تحسينات CSS
└── يوم 5: الاختبار والتوثيق
```

---

## 🎯 النتائج المتوقعة

| المقياس | قبل | بعد | التحسن |
|---------|-----|-----|--------|
| FCP | ~2.5s | < 1.5s | 40% |
| LCP | ~4s | < 2.5s | 38% |
| Bundle Size | ~800KB | < 400KB | 50% |
| Lighthouse Score | ~70 | > 90 | 29% |
| Offline Support | جزئي | كامل | 100% |
| User Satisfaction | - | +25% | ⬆️ |
