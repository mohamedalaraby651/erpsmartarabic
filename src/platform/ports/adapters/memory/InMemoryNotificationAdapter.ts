import type { NotificationPort, NotificationPayload } from "../../NotificationPort";

export class InMemoryNotificationAdapter implements NotificationPort {
  readonly log: NotificationPayload[] = [];
  notify(p: NotificationPayload): void { this.log.push(p); }
}
