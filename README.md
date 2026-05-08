# نظرة (Nazra) — نظام إدارة الأعمال الذكي

نظام ERP عربي متكامل لإدارة العملاء والمبيعات والمخزون والمحاسبة، مع دعم العمل بدون إنترنت وتعدد الشركات (Multi-tenant).

## المنصة

- **الواجهة**: React 18 + Vite 5 + TypeScript + Tailwind CSS + shadcn-ui
- **الباك إند**: Lovable Cloud (PostgreSQL + Auth + Edge Functions + Storage)
- **PWA**: يعمل بدون إنترنت مع مزامنة تلقائية عند عودة الاتصال
- **اللغة**: عربية (RTL) كاملة + خط Cairo

## بنية المشروع

```
src/
├── components/      # مكونات الواجهة المعاد استخدامها
├── pages/           # صفحات النظام (مرتبطة بالـ routes)
├── hooks/           # React hooks مخصصة
├── lib/             # خدمات، utilities، مولدات PDF/Excel
├── integrations/    # عميل Supabase (مولَّد تلقائياً)
└── __tests__/       # اختبارات وحدات + تكامل + أمان

supabase/
├── functions/       # Edge Functions (Deno)
└── migrations/      # ترحيلات قاعدة البيانات

docs/                # توثيق فني وتقارير المراجعة
e2e/                 # اختبارات Playwright شاملة
```

## التشغيل المحلي

```sh
npm install
npm run dev
```

ثم افتح `http://localhost:5173`.

## التحرير

- **Lovable**: عبر [محرر المشروع](https://lovable.dev) — التغييرات تُرفع تلقائياً.
- **محلياً**: استنسخ المستودع، عدّل، ثم ادفع.
- **GitHub Codespaces**: اضغط Code → Codespaces → New codespace.

## النشر

عبر Lovable: Share → Publish. لربط دومين مخصص: Project → Settings → Domains.

## التوثيق الفني

- `docs/SYSTEM_AUDIT_2026_05.md` — أحدث مراجعة أمنية وأدائية.
- `docs/DATABASE_SCHEMA.md` — مخطط قاعدة البيانات.
- `docs/API_DOCUMENTATION.md` — مرجع Edge Functions.
- `docs/DEPLOYMENT_GUIDE.md` — دليل النشر للإنتاج.

## الأمان

- جميع الجداول محمية بـ Row Level Security (RLS) مع عزل `tenant_id`.
- العمليات الحساسة (المدفوعات، الترحيل المحاسبي) تمر عبر Edge Functions أو RPCs ذرية.
- مفتاح `VITE_SUPABASE_PUBLISHABLE_KEY` في الواجهة هو **publishable** بالتصميم — الحماية تأتي من RLS وليس من إخفاء المفتاح.
