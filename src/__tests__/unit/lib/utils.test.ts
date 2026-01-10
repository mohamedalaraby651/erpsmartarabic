import { describe, it, expect } from 'vitest';
import { cn } from '@/lib/utils';

describe('cn (className utility)', () => {
  it('should merge simple class names', () => {
    const result = cn('class1', 'class2');
    expect(result).toBe('class1 class2');
  });

  it('should handle conditional classes', () => {
    const isActive = true;
    const isDisabled = false;
    const result = cn('base', isActive && 'active', isDisabled && 'disabled');
    expect(result).toBe('base active');
  });

  it('should merge tailwind classes correctly', () => {
    const result = cn('p-4', 'p-8');
    expect(result).toBe('p-8');
  });

  it('should handle object syntax', () => {
    const result = cn({ 'bg-red-500': true, 'text-white': false });
    expect(result).toBe('bg-red-500');
  });

  it('should handle array syntax', () => {
    const result = cn(['class1', 'class2']);
    expect(result).toBe('class1 class2');
  });

  it('should handle undefined and null values', () => {
    const result = cn('base', undefined, null, 'end');
    expect(result).toBe('base end');
  });

  it('should handle empty strings', () => {
    const result = cn('base', '', 'end');
    expect(result).toBe('base end');
  });

  it('should deduplicate conflicting tailwind classes', () => {
    const result = cn('text-sm', 'text-lg', 'font-bold');
    expect(result).toBe('text-lg font-bold');
  });
});
