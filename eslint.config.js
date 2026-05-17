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
