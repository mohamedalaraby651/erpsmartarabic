/**
 * Centralized Secure Operations Layer
 * Q1 Enterprise Transformation - Foundation & Governance
 * 
 * This module provides server-validated operations for sensitive data.
 * All operations go through Edge Functions for permission and limit validation.
 */

import { supabase } from '@/integrations/supabase/client';

// ============================================
// Types
// ============================================

export interface ValidationResult {
  valid: boolean;
  message?: string;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface OperationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface InvoiceValidationData {
  customer_id: string;
  total_amount: number;
  items?: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
  }>;
}

export interface PaymentData {
  customer_id: string;
  invoice_id?: string;
  amount: number;
  payment_method: 'cash' | 'credit_card' | 'bank_transfer' | 'check';
  payment_number: string;
  reference_number?: string;
  notes?: string;
}

export interface ExpenseApprovalData {
  expense_id: string;
  action: 'approve' | 'reject';
  rejection_reason?: string;
}

export interface StockMovementData {
  product_id: string;
  variant_id?: string;
  movement_type: 'in' | 'out' | 'transfer' | 'adjustment';
  quantity: number;
  from_warehouse_id?: string;
  to_warehouse_id?: string;
  reference_type?: string;
  reference_id?: string;
  notes?: string;
}

// ============================================
// Validation Functions
// ============================================

/**
 * Validate invoice data before creation
 * Checks: permissions, financial limits, customer credit limit, product availability
 */
export async function validateInvoice(
  invoiceData: InvoiceValidationData
): Promise<ValidationResult> {
  try {
    const { data, error } = await supabase.functions.invoke('validate-invoice', {
      body: { invoice_data: invoiceData }
    });

    if (error) {
      console.error('[secureOperations] Invoice validation error:', error);
      return {
        valid: false,
        error: error.message || 'فشل التحقق من الفاتورة',
        code: 'VALIDATION_ERROR'
      };
    }

    return data as ValidationResult;
  } catch (err) {
    console.error('[secureOperations] Unexpected error in validateInvoice:', err);
    return {
      valid: false,
      error: 'خطأ غير متوقع أثناء التحقق',
      code: 'UNEXPECTED_ERROR'
    };
  }
}

/**
 * Process payment with server-side validation
 * Handles: permission check, invoice validation, balance updates
 */
export async function processPayment(
  paymentData: PaymentData
): Promise<OperationResult<{ payment_id: string }>> {
  try {
    const { data, error } = await supabase.functions.invoke('process-payment', {
      body: { payment_data: paymentData }
    });

    if (error) {
      console.error('[secureOperations] Payment processing error:', error);
      return {
        success: false,
        error: error.message || 'فشل معالجة الدفعة',
        code: 'PAYMENT_ERROR'
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error,
        code: data.code,
        details: data.details
      };
    }

    return {
      success: true,
      data: { payment_id: data.payment_id },
      details: data.details
    };
  } catch (err) {
    console.error('[secureOperations] Unexpected error in processPayment:', err);
    return {
      success: false,
      error: 'خطأ غير متوقع أثناء معالجة الدفعة',
      code: 'UNEXPECTED_ERROR'
    };
  }
}

/**
 * Approve or reject expense with workflow validation
 * Ensures: proper role, not self-approval, status validation
 */
export async function approveExpense(
  approvalData: ExpenseApprovalData
): Promise<OperationResult<void>> {
  try {
    const { data, error } = await supabase.functions.invoke('approve-expense', {
      body: approvalData
    });

    if (error) {
      console.error('[secureOperations] Expense approval error:', error);
      return {
        success: false,
        error: error.message || 'فشل معالجة المصروف',
        code: 'APPROVAL_ERROR'
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error,
        code: data.code,
        details: data.details
      };
    }

    return {
      success: true,
      details: data.details
    };
  } catch (err) {
    console.error('[secureOperations] Unexpected error in approveExpense:', err);
    return {
      success: false,
      error: 'خطأ غير متوقع أثناء معالجة المصروف',
      code: 'UNEXPECTED_ERROR'
    };
  }
}

/**
 * Process stock movement with inventory validation
 * Validates: permissions, stock availability, warehouse existence
 */
export async function processStockMovement(
  movementData: StockMovementData
): Promise<OperationResult<{ movement_id: string }>> {
  try {
    const { data, error } = await supabase.functions.invoke('stock-movement', {
      body: { movement_data: movementData }
    });

    if (error) {
      console.error('[secureOperations] Stock movement error:', error);
      return {
        success: false,
        error: error.message || 'فشل تنفيذ حركة المخزون',
        code: 'MOVEMENT_ERROR'
      };
    }

    if (!data.success) {
      return {
        success: false,
        error: data.error,
        code: data.code,
        details: data.details
      };
    }

    return {
      success: true,
      data: { movement_id: data.movement_id },
      details: data.details
    };
  } catch (err) {
    console.error('[secureOperations] Unexpected error in processStockMovement:', err);
    return {
      success: false,
      error: 'خطأ غير متوقع أثناء تنفيذ حركة المخزون',
      code: 'UNEXPECTED_ERROR'
    };
  }
}

// ============================================
// Permission Verification (Server-Side)
// ============================================

/**
 * Verify permission on server using database function
 * This is the authoritative check - frontend checks are UI hints only
 */
export async function verifyPermissionOnServer(
  section: string,
  action: 'view' | 'create' | 'edit' | 'delete'
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return false;

    const { data, error } = await supabase.rpc('check_section_permission', {
      _user_id: user.id,
      _section: section,
      _action: action
    });

    if (error) {
      console.error('[secureOperations] Permission check error:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('[secureOperations] Unexpected error in verifyPermissionOnServer:', err);
    return false;
  }
}

/**
 * Verify financial limit on server
 */
export async function verifyFinancialLimit(
  limitType: 'discount' | 'credit' | 'invoice',
  value: number
): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) return false;

    const { data, error } = await supabase.rpc('check_financial_limit', {
      _user_id: user.id,
      _limit_type: limitType,
      _value: value
    });

    if (error) {
      console.error('[secureOperations] Limit check error:', error);
      return false;
    }

    return data === true;
  } catch (err) {
    console.error('[secureOperations] Unexpected error in verifyFinancialLimit:', err);
    return false;
  }
}

// ============================================
// Error Message Helpers
// ============================================

/**
 * Get user-friendly error message based on error code
 */
export function getErrorMessage(code: string): string {
  const messages: Record<string, string> = {
    'UNAUTHORIZED': 'يجب تسجيل الدخول للقيام بهذا الإجراء',
    'INVALID_TOKEN': 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً',
    'NO_PERMISSION': 'ليس لديك صلاحية للقيام بهذا الإجراء',
    'LIMIT_EXCEEDED': 'المبلغ يتجاوز الحد المسموح لك',
    'CREDIT_LIMIT_EXCEEDED': 'تم تجاوز الحد الائتماني للعميل',
    'CUSTOMER_NOT_FOUND': 'العميل غير موجود',
    'INVOICE_NOT_FOUND': 'الفاتورة غير موجودة',
    'PRODUCT_NOT_FOUND': 'المنتج غير موجود',
    'INSUFFICIENT_STOCK': 'الكمية المطلوبة غير متوفرة في المخزون',
    'AMOUNT_EXCEEDS_BALANCE': 'المبلغ يتجاوز رصيد الفاتورة المتبقي',
    'INACTIVE_PRODUCTS': 'بعض المنتجات غير نشطة',
    'SELF_APPROVAL': 'لا يمكنك الموافقة على مصروفاتك الخاصة',
    'INVALID_STATUS': 'حالة العنصر لا تسمح بهذا الإجراء',
    'MISSING_DATA': 'بيانات ناقصة',
    'MISSING_REASON': 'يجب إدخال سبب الرفض',
    'MISSING_WAREHOUSE': 'يجب تحديد المستودع',
    'INTERNAL_ERROR': 'حدث خطأ داخلي، يرجى المحاولة لاحقاً',
  };

  return messages[code] || 'حدث خطأ غير متوقع';
}
