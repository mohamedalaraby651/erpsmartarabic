-- Fix function search_path security warnings
ALTER FUNCTION generate_expense_number() SET search_path = public;
ALTER FUNCTION generate_cash_transaction_number() SET search_path = public;