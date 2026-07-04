import type { NotificationPort, NotificationPayload } from "../../NotificationPort";
import { toast } from "@/hooks/use-toast";

export class BrowserNotificationAdapter implements NotificationPort {
  notify(p: NotificationPayload): void {
    toast({
      title: p.title,
      description: p.description,
      variant: p.level === "error" ? "destructive" : "default",
      duration: p.durationMs,
    });
  }
}
