import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  hexToHsl, 
  applyTheme, 
  saveThemeToLocalStorage, 
  getThemeFromLocalStorage,
  defaultThemeConfig,
  ThemeConfig 
} from '@/lib/themeManager';

describe('hexToHsl', () => {
  it('should convert red (#ff0000) to HSL correctly', () => {
    const result = hexToHsl('#ff0000');
    expect(result.h).toBe(0);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
  });

  it('should convert green (#00ff00) to HSL correctly', () => {
    const result = hexToHsl('#00ff00');
    expect(result.h).toBe(120);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
  });

  it('should convert blue (#0000ff) to HSL correctly', () => {
    const result = hexToHsl('#0000ff');
    expect(result.h).toBe(240);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
  });

  it('should convert white (#ffffff) to HSL correctly', () => {
    const result = hexToHsl('#ffffff');
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.l).toBe(100);
  });

  it('should convert black (#000000) to HSL correctly', () => {
    const result = hexToHsl('#000000');
    expect(result.h).toBe(0);
    expect(result.s).toBe(0);
    expect(result.l).toBe(0);
  });

  it('should handle hex without # prefix', () => {
    const result = hexToHsl('ff0000');
    expect(result.h).toBe(0);
    expect(result.s).toBe(100);
    expect(result.l).toBe(50);
  });

  it('should return default HSL for invalid hex', () => {
    const result = hexToHsl('invalid');
    expect(result).toEqual({ h: 222, s: 47, l: 51 });
  });

  it('should convert Tailwind blue-600 (#2563eb) correctly', () => {
    const result = hexToHsl('#2563eb');
    expect(result.h).toBe(217);
    expect(result.s).toBeGreaterThan(80);
    expect(result.l).toBeGreaterThan(40);
    expect(result.l).toBeLessThan(60);
  });
});

describe('applyTheme', () => {
  beforeEach(() => {
    // Reset document for each test
    document.documentElement.className = '';
    document.documentElement.style.cssText = '';
    document.body.style.cssText = '';
  });

  it('should apply dark theme', () => {
    applyTheme({ theme: 'dark' });
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should apply light theme', () => {
    document.documentElement.classList.add('dark');
    applyTheme({ theme: 'light' });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should apply system theme based on media query', () => {
    applyTheme({ theme: 'system' });
    // Since matchMedia is mocked to return false, should not have dark
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should apply primary color', () => {
    applyTheme({ primaryColor: '#ff0000' });
    const style = document.documentElement.style.getPropertyValue('--primary');
    expect(style).toContain('0');
  });

  it('should apply font family', () => {
    applyTheme({ fontFamily: 'Cairo' });
    expect(document.body.style.fontFamily).toContain('Cairo');
  });

  it('should apply small font size', () => {
    applyTheme({ fontSize: 'small' });
    expect(document.body.style.fontSize).toBe('14px');
  });

  it('should apply medium font size', () => {
    applyTheme({ fontSize: 'medium' });
    expect(document.body.style.fontSize).toBe('16px');
  });

  it('should apply large font size', () => {
    applyTheme({ fontSize: 'large' });
    expect(document.body.style.fontSize).toBe('18px');
  });

  it('should apply sidebar compact mode', () => {
    applyTheme({ sidebarCompact: true });
    expect(document.documentElement.getAttribute('data-sidebar-compact')).toBe('true');
  });
});

describe('saveThemeToLocalStorage', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    vi.mocked(localStorage.setItem).mockClear();
  });

  it('should save theme to localStorage', () => {
    saveThemeToLocalStorage({ theme: 'dark' });
    expect(localStorage.setItem).toHaveBeenCalledWith(
      'user-theme-config',
      expect.stringContaining('"theme":"dark"')
    );
  });

  it('should merge with existing config', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ theme: 'light', primaryColor: '#ff0000' })
    );
    
    saveThemeToLocalStorage({ fontSize: 'large' });
    
    const savedValue = vi.mocked(localStorage.setItem).mock.calls[0][1];
    const parsed = JSON.parse(savedValue);
    expect(parsed.theme).toBe('light');
    expect(parsed.primaryColor).toBe('#ff0000');
    expect(parsed.fontSize).toBe('large');
  });
});

describe('getThemeFromLocalStorage', () => {
  beforeEach(() => {
    vi.mocked(localStorage.getItem).mockClear();
  });

  it('should return default config when localStorage is empty', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(null);
    
    const result = getThemeFromLocalStorage();
    expect(result).toEqual(defaultThemeConfig);
  });

  it('should return stored config', () => {
    const storedConfig: ThemeConfig = {
      ...defaultThemeConfig,
      theme: 'dark',
      primaryColor: '#ff0000',
    };
    vi.mocked(localStorage.getItem).mockReturnValue(JSON.stringify(storedConfig));
    
    const result = getThemeFromLocalStorage();
    expect(result.theme).toBe('dark');
    expect(result.primaryColor).toBe('#ff0000');
  });

  it('should merge stored config with defaults', () => {
    vi.mocked(localStorage.getItem).mockReturnValue(
      JSON.stringify({ theme: 'dark' })
    );
    
    const result = getThemeFromLocalStorage();
    expect(result.theme).toBe('dark');
    expect(result.fontFamily).toBe(defaultThemeConfig.fontFamily);
  });

  it('should return default config on JSON parse error', () => {
    vi.mocked(localStorage.getItem).mockReturnValue('invalid json');
    
    const result = getThemeFromLocalStorage();
    expect(result).toEqual(defaultThemeConfig);
  });
});

describe('defaultThemeConfig', () => {
  it('should have correct default values', () => {
    expect(defaultThemeConfig.theme).toBe('system');
    expect(defaultThemeConfig.primaryColor).toBe('#2563eb');
    expect(defaultThemeConfig.accentColor).toBe('#8b5cf6');
    expect(defaultThemeConfig.fontFamily).toBe('Cairo');
    expect(defaultThemeConfig.fontSize).toBe('medium');
    expect(defaultThemeConfig.sidebarCompact).toBe(false);
  });
});
