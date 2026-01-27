import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import React from 'react';

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ pathname: '/' }),
  };
});

const createWrapper = () => {
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(BrowserRouter, null, children);
};

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('should be defined', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    expect(useKeyboardShortcuts).toBeDefined();
  });

  it('should return shortcuts list', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    const { result } = renderHook(() => useKeyboardShortcuts(), {
      wrapper: createWrapper(),
    });

    expect(result.current.shortcuts).toBeDefined();
    expect(Array.isArray(result.current.shortcuts)).toBe(true);
    expect(result.current.shortcuts.length).toBeGreaterThan(0);
  });

  it('should include default navigation shortcuts', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    const { result } = renderHook(() => useKeyboardShortcuts(), {
      wrapper: createWrapper(),
    });

    const shortcutKeys = result.current.shortcuts.map(s => s.key);
    expect(shortcutKeys).toContain('Ctrl+K');
    expect(shortcutKeys).toContain('Alt+1');
    expect(shortcutKeys).toContain('Alt+2');
    expect(shortcutKeys).toContain('Alt+3');
    expect(shortcutKeys).toContain('Alt+4');
  });

  it('should navigate to search on Ctrl+K', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    renderHook(() => useKeyboardShortcuts(), { wrapper: createWrapper() });

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/search');
  });

  it('should navigate to home on Alt+1', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    renderHook(() => useKeyboardShortcuts(), { wrapper: createWrapper() });

    const event = new KeyboardEvent('keydown', {
      key: '1',
      altKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should navigate to customers on Alt+2', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    renderHook(() => useKeyboardShortcuts(), { wrapper: createWrapper() });

    const event = new KeyboardEvent('keydown', {
      key: '2',
      altKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/customers');
  });

  it('should navigate to products on Alt+3', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    renderHook(() => useKeyboardShortcuts(), { wrapper: createWrapper() });

    const event = new KeyboardEvent('keydown', {
      key: '3',
      altKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/products');
  });

  it('should navigate to invoices on Alt+4', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    renderHook(() => useKeyboardShortcuts(), { wrapper: createWrapper() });

    const event = new KeyboardEvent('keydown', {
      key: '4',
      altKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockNavigate).toHaveBeenCalledWith('/invoices');
  });

  it('should not trigger shortcuts when typing in input', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    renderHook(() => useKeyboardShortcuts(), { wrapper: createWrapper() });

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });

    Object.defineProperty(event, 'target', { value: input });

    act(() => {
      window.dispatchEvent(event);
    });

    // Should not navigate because target is input
    expect(mockNavigate).not.toHaveBeenCalled();

    document.body.removeChild(input);
  });

  it('should not trigger shortcuts when typing in textarea', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    renderHook(() => useKeyboardShortcuts(), { wrapper: createWrapper() });

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });

    Object.defineProperty(event, 'target', { value: textarea });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(mockNavigate).not.toHaveBeenCalled();

    document.body.removeChild(textarea);
  });

  it('should support custom shortcuts', async () => {
    const customAction = vi.fn();
    const customShortcuts = [
      {
        key: 'n',
        ctrlKey: true,
        action: customAction,
        description: 'إنشاء جديد',
      },
    ];

    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    const { result } = renderHook(() => useKeyboardShortcuts(customShortcuts), {
      wrapper: createWrapper(),
    });

    expect(result.current.shortcuts.some(s => s.description === 'إنشاء جديد')).toBe(true);

    const event = new KeyboardEvent('keydown', {
      key: 'n',
      ctrlKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(customAction).toHaveBeenCalled();
  });

  it('should give priority to custom shortcuts over global', async () => {
    const customAction = vi.fn();
    const customShortcuts = [
      {
        key: 'k',
        ctrlKey: true,
        action: customAction,
        description: 'Custom search',
      },
    ];

    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    renderHook(() => useKeyboardShortcuts(customShortcuts), {
      wrapper: createWrapper(),
    });

    const event = new KeyboardEvent('keydown', {
      key: 'k',
      ctrlKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    // Custom action should be called instead of default navigation
    expect(customAction).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('should remove event listener on unmount', async () => {
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    const { unmount } = renderHook(() => useKeyboardShortcuts(), {
      wrapper: createWrapper(),
    });

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('should handle shortcut with shift modifier', async () => {
    const customAction = vi.fn();
    const customShortcuts = [
      {
        key: 's',
        ctrlKey: true,
        shiftKey: true,
        action: customAction,
        description: 'Save all',
      },
    ];

    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    const { result } = renderHook(() => useKeyboardShortcuts(customShortcuts), {
      wrapper: createWrapper(),
    });

    expect(result.current.shortcuts.some(s => s.key === 'Ctrl+Shift+S')).toBe(true);

    const event = new KeyboardEvent('keydown', {
      key: 's',
      ctrlKey: true,
      shiftKey: true,
      bubbles: true,
    });

    act(() => {
      window.dispatchEvent(event);
    });

    expect(customAction).toHaveBeenCalled();
  });
});
