# خط الأساس (Baseline) — لقطة قبل بدء التثبيت

> تاريخ القياس: 2026-05-22 — قبل بدء Phase 1.
> يُحدَّث عند نهاية كل Phase لمتابعة التقدم نحو KPI = 0.

## مقاييس الكود

| المقياس | الحالي | الهدف | ملاحظات |
|---|---|---|---|
| ملفات تحوي `supabase.from(` خارج repositories/services | **62** | 0 | استثناءات: `lib/financial-engine/`, `hooks/useTenant.ts`, اختبارات |
| إجمالي ملفات تستخدم `supabase.from(` | 68 | — | منها 6 ضمن repos/services حالياً |
| `as any` في الإنتاج | 111 | 0 | عبر `src/` |
| `console.log` / `console.warn` | 44 | 0 | يُسمح `console.error` فقط |
| ملفات إنتاج > 500 سطر | **4** | 0 | `CustomerDetailsPage` 854, `CustomerListCard` 543, `arabicFont` 546, `pdfGenerator` 509 (sidebar.tsx و types.ts مستثناة) |
| Repositories | 5 | +15 | customer, supplier, invoice, product, + علاقات/بحث |

## ملفات الاختبار (مرجعية، لا تُحسب)

- `__tests__/integration/pwa-offline.test.ts` — 605
- `__tests__/integration/export-print.test.tsx` — 514

## أمر إعادة القياس

```bash
rg -l "supabase\.from\(" src -g '*.ts' -g '*.tsx' \
  | grep -v "src/lib/repositories/" \
  | grep -v "src/lib/services/" \
  | grep -v "src/lib/financial-engine/" \
  | grep -v "src/hooks/useTenant" \
  | grep -v "__tests__" \
  | wc -l

rg "as any\b" src -g '*.ts' -g '*.tsx' | wc -l
rg "console\.(log|warn)\(" src -g '*.ts' -g '*.tsx' | wc -l
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/__tests__/*" \
  -not -name "types.ts" -not -name "sidebar.tsx" \
  -exec wc -l {} \; | awk '$1 > 500'
```
