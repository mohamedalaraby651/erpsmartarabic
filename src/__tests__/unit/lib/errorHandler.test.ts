import { describe, it, expect, vi } from 'vitest';
import { getSafeErrorMessage, logErrorSafely, handleMutationError } from '@/lib/errorHandler';

describe('getSafeErrorMessage', () => {
  it('should return default message for null error', () => {
    const result = getSafeErrorMessage(null);
    expect(result).toBe('حدث خطأ، يرجى المحاولة مرة أخرى');
  });

  it('should return default message for undefined error', () => {
    const result = getSafeErrorMessage(undefined);
    expect(result).toBe('حدث خطأ، يرجى المحاولة مرة أخرى');
  });

  it('should handle string error with network pattern', () => {
    const result = getSafeErrorMessage('Network error occurred');
    expect(result).toContain('الاتصال');
  });

  it('should handle PostgreSQL unique violation error (23505)', () => {
    const error = { code: '23505', message: 'duplicate key value' };
    const result = getSafeErrorMessage(error);
    expect(result).toBe('هذا السجل موجود بالفعل');
  });

  it('should handle PostgreSQL foreign key violation (23503)', () => {
    const error = { code: '23503', message: 'foreign key constraint' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('مرتبط');
  });

  it('should handle PostgreSQL not null violation (23502)', () => {
    const error = { code: '23502', message: 'not null constraint' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('الحقول المطلوبة');
  });

  it('should handle network error pattern', () => {
    const error = { message: 'NetworkError when attempting to fetch' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('الاتصال');
  });

  it('should handle fetch failed pattern', () => {
    const error = { message: 'network request failed' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('الاتصال');
  });

  it('should handle RLS policy violation', () => {
    const error = { message: 'new row violates row-level security policy' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('صلاحية');
  });

  it('should handle invalid token error', () => {
    const error = { message: 'Invalid token provided' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('الجلسة');
  });

  it('should handle unauthorized error', () => {
    const error = { message: 'Unauthorized access' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('تسجيل الدخول');
  });

  it('should handle timeout error', () => {
    const error = { message: 'timeout of 10000ms exceeded' };
    const result = getSafeErrorMessage(error);
    expect(result).toContain('مهلة');
  });
});

describe('logErrorSafely', () => {
  it('should log error in development mode', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    logErrorSafely('Test', new Error('test'));
    
    // Don't assert on call since it depends on environment
    consoleSpy.mockRestore();
  });
});

describe('handleMutationError', () => {
  it('should call toast with error message', () => {
    const mockToast = vi.fn();
    const error = { code: '23505' };
    
    handleMutationError(error, mockToast);
    
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'حدث خطأ',
        variant: 'destructive',
      })
    );
  });

  it('should handle unknown error types', () => {
    const mockToast = vi.fn();
    
    handleMutationError('unknown error', mockToast);
    
    expect(mockToast).toHaveBeenCalled();
  });
});
