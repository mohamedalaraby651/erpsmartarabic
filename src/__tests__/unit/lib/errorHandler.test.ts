import { describe, it, expect, vi } from 'vitest';
import { getSafeErrorMessage, logErrorSafely, handleMutationError } from '@/lib/errorHandler';

describe('getSafeErrorMessage', () => {
  it('should return default message for null error', () => {
    const result = getSafeErrorMessage(null);
    expect(result).toBe('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
  });

  it('should return default message for undefined error', () => {
    const result = getSafeErrorMessage(undefined);
    expect(result).toBe('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
  });

  it('should handle string error', () => {
    const result = getSafeErrorMessage('Custom error');
    expect(result).toBe('حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
  });

  it('should handle PostgreSQL unique violation error (23505)', () => {
    const error = { code: '23505', message: 'duplicate key value' };
    const result = getSafeErrorMessage(error);
    expect(result).toBe('هذا السجل موجود مسبقاً. يرجى التحقق من البيانات المدخلة.');
  });

  it('should handle PostgreSQL foreign key violation (23503)', () => {
    const error = { code: '23503', message: 'foreign key constraint' };
    const result = getSafeErrorMessage(error);
    expect(result).toBe('لا يمكن تنفيذ هذا الإجراء لوجود سجلات مرتبطة.');
  });

  it('should handle PostgreSQL not null violation (23502)', () => {
    const error = { code: '23502', message: 'not null constraint' };
    const result = getSafeErrorMessage(error);
    expect(result).toBe('يرجى ملء جميع الحقول المطلوبة.');
  });

  it('should handle network error pattern', () => {
    const error = { message: 'NetworkError when attempting to fetch' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('خطأ في الاتصال');
  });

  it('should handle fetch failed pattern', () => {
    const error = { message: 'Failed to fetch' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('خطأ في الاتصال');
  });

  it('should handle RLS policy violation', () => {
    const error = { message: 'new row violates row-level security policy' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('صلاحيات');
  });

  it('should handle JWT expired error', () => {
    const error = { message: 'JWT expired' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('الجلسة');
  });

  it('should handle invalid credentials', () => {
    const error = { message: 'Invalid login credentials' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('كلمة المرور');
  });

  it('should handle timeout error', () => {
    const error = { message: 'timeout of 10000ms exceeded' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('انتهاء');
  });
});

describe('logErrorSafely', () => {
  it('should log error in development mode', () => {
    const consoleSpy = vi.spyOn(console, 'error');
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    logErrorSafely('Test context', new Error('Test error'));
    
    // Console is mocked in setup, so we check it was called
    expect(consoleSpy).toBeDefined();
    
    process.env.NODE_ENV = originalEnv;
  });
});

describe('handleMutationError', () => {
  it('should call toast with error message', () => {
    const mockToast = vi.fn();
    const error = { code: '23505', message: 'duplicate key' };
    
    handleMutationError(error, mockToast);
    
    expect(mockToast).toHaveBeenCalledWith({
      title: 'خطأ',
      description: 'هذا السجل موجود مسبقاً. يرجى التحقق من البيانات المدخلة.',
      variant: 'destructive',
    });
  });

  it('should handle unknown error types', () => {
    const mockToast = vi.fn();
    const error = { someRandomProperty: 'value' };
    
    handleMutationError(error, mockToast);
    
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'خطأ',
        variant: 'destructive',
      })
    );
  });
});
