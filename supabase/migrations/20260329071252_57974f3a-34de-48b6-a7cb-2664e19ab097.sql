CREATE INDEX IF NOT EXISTS idx_invoices_customer_payment ON invoices(customer_id, payment_status);
CREATE INDEX IF NOT EXISTS idx_payments_customer ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_comms_customer ON customer_communications(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_reminders_customer ON customer_reminders(customer_id);