export type NotificationLevel = "info" | "success" | "warning" | "error";
export interface NotificationPayload {
  level: NotificationLevel;
  title: string;
  description?: string;
  durationMs?: number;
}
export interface NotificationPort {
  notify(payload: NotificationPayload): void;
}
