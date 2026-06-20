# Wave 1.2 — `Money.ts` (Financial Arithmetic Kernel)

تطبيق صارم لـ ADR-0011 §4 (R-1106a..f). هذا أخطر ملف في الـ kernel كله — كل بقية الحسابات في `Invoice` ستبنى فوقه.

## 🔒 النطاق المسموح (قفل صارم)
- إنشاء: `src/domain/finance/shared/Money.ts`
- إنشاء: `src/domain/finance/shared/__tests__/Money.test.ts`
- لا تعديل في `Currency.ts` ولا أي ملف آخر. لا ADR، لا shared-kernel، لا index barrels.

## 🧱 التصميم — `Money.ts`

### بنية الـ VO
- `class Money` — `private constructor(amount: number, currency: Currency)` + `Object.freeze(this)`.
- خصائص مكشوفة `readonly`: `amount: number` (minor units integer)، `currency: Currency`.
- **بدون** أي ميثود يعرض float أو يحوّل لـ major units (المسؤولية في طبقة UI لاحقاً، خارج الـ domain).

### الـ Factories
- `static of(amount: number, currency: Currency): Result<Money, MoneyDomainError>`
  - حارس R-1106a: `Number.isInteger(amount) && Math.abs(amount) <= Number.MAX_SAFE_INTEGER` وإلا `NonIntegerMoney`.
- `static zero(currency: Currency): Money` — اختصار آمن (صفر عدد صحيح، لا حاجة لـ Result).

### العمليات الحسابية
- `add(other: Money): Result<Money, MoneyDomainError>` — R-1106b. يتحقق `this.currency.equals(other.currency)`، وإلا `CurrencyMismatch`. ثم `of(this.amount + other.amount, this.currency)` (يلتقط overflow عبر نفس حارس R-1106a).
- `sub(other: Money): Result<Money, MoneyDomainError>` — مطابق لـ `add`.
- `mulScalar(numerator: number, denominator: number): Result<Money, MoneyDomainError>` — **النقطة الوحيدة في الـ kernel كله المسموح فيها بـ `Math.round`** (R-1106c/f).
  - حراس مسبقة: `Number.isInteger(numerator)` و `Number.isInteger(denominator)` و `denominator !== 0` و كلاهما ضمن `MAX_SAFE_INTEGER` ⇒ `InvalidScalar` كنوع فرعي من الخطأ.
  - الحساب: `Math.round((this.amount * numerator) / denominator)` ثم تمريره عبر `of(...)` لاكتشاف overflow في الناتج (يرجع `NonIntegerMoney`).
- `eq(other: Money): boolean` — مقارنة بنيوية (نفس currency.code + نفس amount).
- `isZero(): boolean`، `isNegative(): boolean`، `isPositive(): boolean` — مقارنات أعداد صحيحة فقط.

### تصنيف الأخطاء (محلي للـ Money)
```ts
export type MoneyDomainError =
  | { kind: "NonIntegerMoney"; amount: number; currencyCode: string }
  | { kind: "CurrencyMismatch"; left: string; right: string }
  | { kind: "InvalidScalar"; numerator: number; denominator: number; reason: "NonInteger" | "ZeroDenominator" | "Unsafe" };
```
ملاحظة: ADR-0011 يذكر صراحةً `NonIntegerMoney` و `CurrencyMismatch`. `InvalidScalar` إضافة لازمة لتنفيذ شرط R-1106c ("MUST be safe integers; denominator !== 0") — هي امتدادٌ محلي لا يكسر أي قاعدة ADR. سيُدمج لاحقاً في `InvoiceDomainError` في Wave 5.

### قيود اللغة (R-1106f)
- لا `toFixed`، لا `parseFloat`، لا decimal literals في الملف كله.
- `Math.round` يظهر **مرة واحدة فقط** داخل جسم `mulScalar` (allow-list موعود في R-1106f).
- لا `new Date`، لا `fetch`، لا `supabase`، لا deep imports.
- الاستيراد الخارجي الوحيد = `@/shared-kernel` (Result/ok/err) + استيراد محلي `./Currency`.

## 🧪 الاختبارات — `Money.test.ts` (≥ 28 حالة)

تغطية:
1. **Construction (5)**: `of(0, USD)` ok؛ `of(1500, USD)` ok؛ `of(1.5, USD)` ⇒ `NonIntegerMoney`؛ `of(NaN, USD)` ⇒ err؛ `of(Number.MAX_SAFE_INTEGER + 1, USD)` ⇒ err.
2. **zero (2)**: `Money.zero(USD).amount === 0`؛ `Money.zero(JPY).currency.code === 'JPY'`.
3. **add (4)**: نفس عملة ⇒ مجموع صحيح؛ عملتان مختلفتان ⇒ `CurrencyMismatch`؛ overflow ⇒ `NonIntegerMoney`؛ مع zero.
4. **sub (3)**: نفس عملة ⇒ فرق (يقبل سالب)؛ عملتان مختلفتان ⇒ err؛ underflow.
5. **mulScalar — الصحيحة (6)**:
   - `1500 * 15 / 100 = 225` (15% ضريبة على 15.00 = 2.25).
   - `1500 * 1500 / 10000 = 225` (basisPoints path R-1106d).
   - half-away-from-zero موجب: `1 * 1 / 2 = 1` (Math.round(0.5)=1 — موضوع لاحظة).
   - half-away-from-zero سالب: `-1 * 1 / 2 = 0` (سلوك `Math.round` لـ -0.5 هو 0؛ نوثقها في الاختبار كـ documented JS behavior).
   - أمثلة JPY (exponent 0): `100 * 5 / 100 = 5`.
   - أمثلة KWD (exponent 3): `1000 * 75 / 1000 = 75`.
6. **mulScalar — الحراس (5)**: `den=0` ⇒ `InvalidScalar/ZeroDenominator`؛ `num=1.5` ⇒ `InvalidScalar/NonInteger`؛ `den=NaN` ⇒ err؛ `num=MAX_SAFE_INTEGER` ⇒ `InvalidScalar/Unsafe`؛ ناتج خارج safe range ⇒ `NonIntegerMoney`.
7. **eq / isZero / isPositive / isNegative (3)**.
8. **Immutability (1)**: محاولة تعديل `amount` بعد التجميد لا تنجح.
9. **Currency isolation (1)**: عملية على `USD+EUR` ترجع `CurrencyMismatch` بدون تنفيذ الحساب.

## 🚦 Gate (لا انتقال إلى Wave 1.3 قبل اجتيازها كلها)

1. TS strict نظيف على `src/domain/finance/**`.
2. `bunx vitest run src/domain/finance/shared/__tests__/Money.test.ts` = 28/28 خضراء.
3. فحص النص:
   - `rg -n "Math\.round" src/domain/finance/shared/Money.ts` = **سطر واحد فقط** داخل `mulScalar`.
   - `rg -n "toFixed|parseFloat|new Date|fetch\(|supabase|@/shared-kernel/" src/domain/finance/shared/Money.ts` = ∅.
   - `rg -n "[0-9]+\.[0-9]+" src/domain/finance/shared/Money.ts` = ∅ (لا decimal literals).
4. الاستيراد الخارجي الوحيد = `@/shared-kernel`؛ المحلي `./Currency` فقط.
5. مراجعتك ERP (design + invariant + test + risk) ⇒ موافقة صريحة قبل Wave 1.3 (`TaxRate.ts`).

## النقطة الوحيدة المطلوب تثبيتها قبل البناء

`InvalidScalar` ليس مذكوراً حرفياً في ADR-0011 — هو الترجمة الطبيعية لشرط R-1106c. هل تعتمده كـ sub-error محلي في `MoneyDomainError`، أم تفضّل دمجه ضمن `NonIntegerMoney` (واحد بدلاً من اثنين)؟

- **(أ) `InvalidScalar` مستقل** ← أوضح في diagnostics ومراجعة لاحقاً في Invoice errors. **(موصى به)**
- **(ب) دمجه في `NonIntegerMoney`** ← تصنيف أبسط لكن يفقد سياق "أين كان الخطأ" (المدخل vs الناتج).

أكّد (أ) أو (ب) → أنتقل لوضع البناء وأنفذ Wave 1.2 فوراً.
