import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

/**
 * منع تمرير نصوص حرفية (Literal) إلى aria-label / tooltip / TooltipContent.
 * يجب استخدام مفاتيح من src/lib/uiCopy.ts (tooltips/regions/quickActionLabels).
 */
const noHardcodedAriaTooltip = {
  // aria-label="نص"
  'JSXAttribute[name.name="aria-label"] > Literal': {
    message:
      'لا تستخدم نصاً حرفياً في aria-label. استورد المفتاح من "@/lib/uiCopy" (tooltips/regions).',
  },
  // aria-label={"نص"} أو aria-label={`نص`} بدون تعبيرات
  'JSXAttribute[name.name="aria-label"] > JSXExpressionContainer > Literal': {
    message:
      'لا تستخدم نصاً حرفياً في aria-label. استورد المفتاح من "@/lib/uiCopy".',
  },
  'JSXAttribute[name.name="aria-label"] > JSXExpressionContainer > TemplateLiteral[expressions.length=0]': {
    message:
      'لا تستخدم نصاً حرفياً في aria-label. استورد المفتاح من "@/lib/uiCopy".',
  },
  // tooltip="نص" (prop مخصص)
  'JSXAttribute[name.name="tooltip"] > Literal': {
    message:
      'لا تستخدم نصاً حرفياً في tooltip. استورد المفتاح من "@/lib/uiCopy".',
  },
  'JSXAttribute[name.name="tooltip"] > JSXExpressionContainer > Literal': {
    message:
      'لا تستخدم نصاً حرفياً في tooltip. استورد المفتاح من "@/lib/uiCopy".',
  },
  // <TooltipContent>نص</TooltipContent>
  'JSXElement[openingElement.name.name="TooltipContent"] > JSXText': {
    message:
      'لا تضع نصاً حرفياً داخل <TooltipContent>. استخدم {tooltips.X} من "@/lib/uiCopy".',
  },
  'JSXElement[openingElement.name.name="TooltipContent"] > JSXExpressionContainer > Literal': {
    message:
      'لا تضع نصاً حرفياً داخل <TooltipContent>. استخدم {tooltips.X} من "@/lib/uiCopy".',
  },
  'JSXElement[openingElement.name.name="TooltipContent"] > JSXExpressionContainer > TemplateLiteral[expressions.length=0]': {
    message:
      'لا تضع نصاً حرفياً داخل <TooltipContent>. استخدم {tooltips.X} من "@/lib/uiCopy".',
  },
};

const restrictedSyntaxEntries = Object.entries(noHardcodedAriaTooltip).map(
  ([selector, { message }]) => ({ selector, message }),
);

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // TypeScript Quality
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn",
      // Security - prevent console in production
      "no-console": ["warn", { allow: ["warn", "error"] }],
      // Best Practices
      "prefer-const": "warn",
      "no-var": "error",
      // إلزام استخدام مفاتيح uiCopy لكل aria-label / tooltip
      "no-restricted-syntax": ["warn", ...restrictedSyntaxEntries],
    },
  },
  {
    /**
     * UX-1A — Design Token discipline (WARN only).
     *
     * Inside `src/ui/**` and `src/workspaces/**`, forbid hardcoded visual
     * primitives. Use semantic tokens / Tailwind utilities backed by
     * `src/ui/tokens` and `src/index.css` CSS variables.
     *
     * Graduated to error in a later wave once violations reach zero.
     */
    files: ["src/ui/**/*.{ts,tsx}", "src/workspaces/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["warn",
        ...restrictedSyntaxEntries,
        {
          // Hardcoded hex colors in JSX / string literals.
          selector: "Literal[value=/^#(?:[0-9a-fA-F]{3}){1,2}$/]",
          message:
            "لا تستخدم ألواناً ثابتة (#hex). استخدم رموز التصميم من '@/ui/tokens' أو Tailwind utilities (bg-primary, text-foreground, ...).",
        },
        {
          // Hardcoded HSL/RGB color strings.
          selector: "Literal[value=/^(?:hsl|rgb)a?\\(/]",
          message:
            "لا تستخدم قيم hsl()/rgb() حرفية. استخدم رموز التصميم أو CSS variables (var(--...)) من نظام التصميم.",
        },
        {
          // Hardcoded font-family strings.
          selector: "Literal[value=/font-family\\s*:/i]",
          message:
            "لا تحدد font-family حرفياً. استخدم --font-sans أو رمز fontFamily من '@/ui/tokens'.",
        },
        {
          // Arbitrary Tailwind color/radius values like text-[#fff] or rounded-[6px].
          selector: "Literal[value=/(?:text|bg|border|fill|stroke|ring|shadow)-\\[#[0-9a-fA-F]{3,8}\\]/]",
          message:
            "لا تستخدم Tailwind arbitrary colors (text-[#...]). استخدم الرموز الدلالية (text-primary, bg-card, ...).",
        },
        {
          // Arbitrary pixel radii — radius must derive from --radius.
          selector: "Literal[value=/\\brounded-\\[(?:\\d+px|\\d*\\.?\\d+rem)\\]/]",
          message:
            "لا تستخدم radii ثابتة (rounded-[6px]). استخدم rounded-sm/md/lg/xl المرتبطة بـ --radius.",
        },
        {
          // Discourage NEW `as any` inside UI/workspaces (warning, not blocking).
          selector: "TSAsExpression > TSAnyKeyword",
          message:
            "تجنّب 'as any' داخل src/ui/** و src/workspaces/**. استخدم type واضح أو unknown مع type guard.",
        },
      ],
    },
  },
  {
    /**
     * Repository boundary: لا يجوز استيراد عميل Supabase
     * من داخل مكوّنات/صفحات UI. يُسمح فقط في:
     *  - src/lib/repositories/**
     *  - src/lib/services/**
     *  - src/lib/financial-engine/**
     *  - src/hooks/useTenant.ts
     *  - src/integrations/** (الملفات المُوَلَّدة)
     * المستوى warn حالياً لتفادي كسر البناء؛ يُرفع إلى error في نهاية Phase 1.
     */
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/repositories/**",
      "src/lib/services/**",
      "src/lib/financial-engine/**",
      "src/hooks/useTenant.ts",
      "src/integrations/**",
      "**/*.test.{ts,tsx}",
      "src/__tests__/**",
    ],
    rules: {
      "no-restricted-imports": ["warn", {
        paths: [{
          name: "@/integrations/supabase/client",
          message:
            "لا تستورد عميل Supabase مباشرة في UI. استخدم repository من '@/lib/repositories' أو service من '@/lib/services'.",
        }],
      }],
    },
  },
  {
    // ملف المصدر الموحّد نفسه + ملفات الاختبار مستثناة
    files: [
      "src/lib/uiCopy.ts",
      "**/*.test.{ts,tsx}",
      "e2e/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-syntax": "off",
    },
  },
);
