/**
 * Theme Registry — single source of truth for available themes.
 *
 * Governed by ADR-0030 (Theme Registry Contract).
 *
 * ThemeProvider must resolve themes through this registry, never through
 * a hardcoded switch. Adding a theme is one `registerTheme` call.
 */

export interface ThemeDefinition {
  /** Stable identifier persisted in layout state and consumer settings. */
  readonly id: string;
  /** Human-readable label for theme pickers. */
  readonly label: string;
  /** Value written to `document.documentElement[data-theme]`. */
  readonly dataAttr: string;
  /** Whether this theme should also toggle Tailwind's `dark` class. */
  readonly prefersDark?: boolean;
  /** WCAG contrast tier this theme is designed to meet. */
  readonly contrast?: "AA" | "AAA";
}

const registry = new Map<string, ThemeDefinition>();

/**
 * Register a theme. Idempotent: re-registering the same id overwrites the
 * previous definition. Feature code must not call this in Waves 2–7.
 */
export function registerTheme(def: ThemeDefinition): void {
  if (!def.id) {
    throw new Error("[themeRegistry] theme id is required");
  }
  registry.set(def.id, Object.freeze({ ...def }));
}

export function getTheme(id: string): ThemeDefinition | undefined {
  return registry.get(id);
}

export function listThemes(): ReadonlyArray<ThemeDefinition> {
  return Array.from(registry.values());
}

/**
 * Test-only reset. Not part of the public contract. Consumers must never
 * call this outside `__tests__`.
 */
export function __resetThemeRegistry(): void {
  registry.clear();
  registerDefaultThemes();
}

function registerDefaultThemes(): void {
  registerTheme({
    id: "light",
    label: "Light",
    dataAttr: "light",
    prefersDark: false,
    contrast: "AA",
  });
  registerTheme({
    id: "dark",
    label: "Dark",
    dataAttr: "dark",
    prefersDark: true,
    contrast: "AA",
  });
  // High-contrast palette lives in src/index.css. QA is Wave 8.
  registerTheme({
    id: "high-contrast",
    label: "High Contrast",
    dataAttr: "high-contrast",
    prefersDark: false,
    contrast: "AAA",
  });
}

registerDefaultThemes();
