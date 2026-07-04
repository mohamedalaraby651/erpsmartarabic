export interface DialogRequest {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
}
export type DialogResult = "confirmed" | "cancelled";
export interface DialogPort {
  confirm(req: DialogRequest): Promise<DialogResult>;
}
