export type CreditNoteWithRelations = {
  id: string;
  credit_note_number: string;
  invoice_id: string;
  customer_id: string;
  amount: number;
  reason: string | null;
  status: string;
  created_at: string;
  customers: { name: string } | null;
  invoices: { invoice_number: string } | null;
};

export const CREDIT_NOTE_STATUS_LABELS: Record<string, string> = {
  draft: 'مسودة',
  confirmed: 'مؤكدة',
  cancelled: 'ملغاة',
};
