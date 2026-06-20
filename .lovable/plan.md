# Wave 1.1 — `Currency.ts` (تعديلان إجباريان قبل التنفيذ)

الكود الذي قدمته صحيح معمارياً، لكن لن يجتاز TS strict ولا فحوصات الـ fitness الحالية بسبب تعارضين موضوعيين مع shared-kernel. أحتاج موافقتك على التعديلين قبل البناء.

## 🔴 تعارض 1 — Deep import محظور

كتبت:
```ts
import { Result } from '@/shared-kernel/result/Result';
```

لكن `src/shared-kernel/index.ts` ينص حرفياً:
> All consumers MUST import from `@/shared-kernel` only. Deep imports … are forbidden by `check-no-deep-imports`.

سيؤدي هذا إلى فشل أحد الـ 10 fitness checks المقرر تفعيلها في Wave 9 (`ui-infrastructure-isolation` / deep-imports family). يجب أن يكون:
```ts
import { Result, isOk, isErr } from '@/shared-kernel';
```

## 🔴 تعارض 2 — Result لا يملك instance methods

في `src/shared-kernel/result/Result.ts` (الموجود فعلاً):
```ts
export type Result<T, E> = Ok<T> | Err<E>;
// Ok = { _tag: 'ok', value: T }
// Err = { _tag: 'err', error: E }
// Result = { ok, err, isOk, isErr, map, mapErr, flatMap }
```

أي:
- لا يوجد `c.isOk()` كميثود — فقط `Result.isOk(c)` / `isOk(c)` كدوال نوع guards.
- الخطأ يُقرأ عبر `.error` وليس `.value`.

اختباراتك تستخدم `c.isOk()` و `c.value.exponent`. الجزء الثاني سليم بعد type narrowing، لكن `c.isOk()` ستفشل TS strict.

## ✅ التصحيح المعتمد (الحد الأدنى — لا تغيير في التصميم)

### `src/domain/finance/shared/Currency.ts`
- استبدال الـ import بسطر واحد: `import { Result, type Result as ResultT } from '@/shared-kernel';` (نستخدم `Result.ok` / `Result.err`، والنوع للتوقيع).
- باقي الكلاس كما هو حرفياً (private ctor + `Object.freeze(this)` + `CURRENCY_TABLE` مُجمَّد + `equals` + `toString`).
- `CurrencyDomainError` يبقى نوعاً محلياً مُصدَّراً.
- لا تغيير في slate الـ 11 عملة ولا exponents.

### `src/domain/finance/shared/__tests__/Currency.test.ts`
(مجلد `__tests__` بدلاً من `tests` لمطابقة convention shared-kernel)
- استبدال كل `c.isOk()` بـ `isOk(c)` وكل `c.isErr()` بـ `isErr(c)`.
- بعد `if (isOk(c))` تبقى `c.value.exponent` صحيحة (type guard ينفِّذ التضييق).
- 12 حالة كما هي — لا حذف ولا إضافة.

## 🚦 Gate (لا انتقال إلى Money.ts قبل اجتيازها كلها)

1. TS strict على `src/domain/finance/**` نظيف.
2. `bunx vitest run src/domain/finance/shared/__tests__/Currency.test.ts` = 12/12.
3. `rg "Math\.|toFixed|parseFloat|new Date|fetch\(|supabase|@/shared-kernel/" src/domain/finance/shared/Currency.ts` = ∅.
4. الـ import الوحيد الخارجي = `@/shared-kernel` (لا deep imports).
5. مراجعتك ERP: design + invariant + test + risk → موافقة صريحة قبل Wave 1.2 (`Money.ts`).

## النطاق المسموح (قفل صارم)
- `src/domain/finance/shared/Currency.ts` (إنشاء)
- `src/domain/finance/shared/__tests__/Currency.test.ts` (إنشاء)
- لا شيء آخر. لا ADR، لا shared-kernel، لا index barrels، لا migrations.

## القرار المطلوب منك
- (أ) موافقة على التصحيحين أعلاه → أنتقل لوضع البناء وأنفذ Wave 1.1 فوراً.
- (ب) رفض → نوقف وننقاش البديل (مثلاً إضافة instance helpers إلى Result في shared-kernel، لكن هذا يكسر "Shared Kernel contracts locked").

أوصي بـ (أ): التعديل سطحي، يحافظ على كل invariant في ADR-0011، ولا يفتح أي ADR مقفل.
