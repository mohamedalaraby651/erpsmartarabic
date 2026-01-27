-- إصلاح مشكلة أمان bank_accounts: تقييد الوصول للمسؤول والمحاسب فقط

-- حذف السياسة القديمة التي تسمح لجميع المستخدمين بالعرض
DROP POLICY IF EXISTS "Authenticated can view bank accounts" ON public.bank_accounts;

-- إنشاء سياسة جديدة تقيد الوصول للأدوار المالية فقط
CREATE POLICY "Financial staff can view bank accounts"
ON public.bank_accounts FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR 
  has_role(auth.uid(), 'accountant'::app_role)
);