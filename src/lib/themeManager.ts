// Theme Manager - Handles CSS variable updates and theme persistence

export interface ThemeConfig {
  theme: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  fontSize: 'small' | 'medium' | 'large';
  sidebarCompact: boolean;
}

export const defaultThemeConfig: ThemeConfig = {
  theme: 'system',
  primaryColor: '#2563eb',
  accentColor: '#8b5cf6',
  fontFamily: 'Cairo',
  fontSize: 'medium',
  sidebarCompact: false,
};

// Convert hex to HSL
export function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 222, s: 47, l: 51 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Apply theme to document
export function applyTheme(config: Partial<ThemeConfig>) {
  const root = document.documentElement;

  // Apply theme mode
  if (config.theme) {
    if (config.theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', isDark);
    } else {
      root.classList.toggle('dark', config.theme === 'dark');
    }
  }

  // Apply primary color
  if (config.primaryColor) {
    const hsl = hexToHsl(config.primaryColor);
    root.style.setProperty('--primary', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    // Generate foreground color based on lightness
    const foregroundL = hsl.l > 50 ? 10 : 98;
    root.style.setProperty('--primary-foreground', `${hsl.h} ${hsl.s}% ${foregroundL}%`);
  }

  // Apply accent color
  if (config.accentColor) {
    const hsl = hexToHsl(config.accentColor);
    root.style.setProperty('--accent', `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    const foregroundL = hsl.l > 50 ? 10 : 98;
    root.style.setProperty('--accent-foreground', `${hsl.h} ${hsl.s}% ${foregroundL}%`);
  }

  // Apply font family
  if (config.fontFamily) {
    root.style.setProperty('--font-family', `"${config.fontFamily}", sans-serif`);
    document.body.style.fontFamily = `"${config.fontFamily}", sans-serif`;
  }

  // Apply font size
  if (config.fontSize) {
    const sizes = { small: '14px', medium: '16px', large: '18px' };
    root.style.setProperty('--base-font-size', sizes[config.fontSize]);
    document.body.style.fontSize = sizes[config.fontSize];
  }

  // Apply sidebar compact mode
  if (config.sidebarCompact !== undefined) {
    root.setAttribute('data-sidebar-compact', config.sidebarCompact.toString());
  }
}

// Save theme to localStorage
export function saveThemeToLocalStorage(config: Partial<ThemeConfig>) {
  const current = getThemeFromLocalStorage();
  const updated = { ...current, ...config };
  localStorage.setItem('user-theme-config', JSON.stringify(updated));
}

// Get theme from localStorage
export function getThemeFromLocalStorage(): ThemeConfig {
  try {
    const stored = localStorage.getItem('user-theme-config');
    if (stored) {
      return { ...defaultThemeConfig, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error('Error reading theme from localStorage:', e);
  }
  return defaultThemeConfig;
}

// Initialize theme on page load
export function initializeTheme() {
  const config = getThemeFromLocalStorage();
  applyTheme(config);

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    const currentConfig = getThemeFromLocalStorage();
    if (currentConfig.theme === 'system') {
      document.documentElement.classList.toggle('dark', e.matches);
    }
  });
}

// Available fonts
export const availableFonts = [
  { value: 'Cairo', label: 'Cairo' },
  { value: 'Tajawal', label: 'Tajawal' },
  { value: 'Almarai', label: 'Almarai' },
  { value: 'Noto Sans Arabic', label: 'Noto Sans Arabic' },
  { value: 'IBM Plex Sans Arabic', label: 'IBM Plex Sans Arabic' },
];

// Preset colors
export const presetColors = [
  { value: '#2563eb', label: 'أزرق' },
  { value: '#16a34a', label: 'أخضر' },
  { value: '#dc2626', label: 'أحمر' },
  { value: '#9333ea', label: 'بنفسجي' },
  { value: '#ea580c', label: 'برتقالي' },
  { value: '#0891b2', label: 'سماوي' },
  { value: '#be185d', label: 'وردي' },
  { value: '#4f46e5', label: 'نيلي' },
];
