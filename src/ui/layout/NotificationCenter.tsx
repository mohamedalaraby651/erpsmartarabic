/**
 * NotificationCenter — popover backed by the optional NotificationProvider.
 * Shell does not fetch; the provider proxies push/poll/realtime sources.
 */
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNotificationProvider, useSlotRegistry } from "../providers/shell-services";
import type { Notification } from "./types";

export function NotificationCenter() {
  const provider = useNotificationProvider();
  const slots = useSlotRegistry();
  const [items, setItems] = useState<readonly Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!provider) return;
    return provider.subscribe(setItems);
  }, [provider]);

  const unread = items.filter((i) => !i.read).length;
  const emptySlot = slots.list("notifications.empty");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="relative inline-flex size-9 items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`}
      >
        <Bell className="size-4" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute end-1.5 top-1.5 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-semibold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-2">
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-sm font-semibold">Notifications</span>
        </div>
        {items.length === 0 ? (
          emptySlot.length > 0 ? (
            <div>{slots.render("notifications.empty")}</div>
          ) : (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              You're all caught up.
            </p>
          )
        ) : (
          <ul className="max-h-80 overflow-y-auto">
            {items.map((n) => (
              <li
                key={n.id}
                className={cn(
                  "rounded-md px-2 py-2 text-sm",
                  !n.read && "bg-accent/40"
                )}
              >
                <div className="font-medium">{n.title}</div>
                {n.description && (
                  <div className="text-xs text-muted-foreground">{n.description}</div>
                )}
              </li>
            ))}
          </ul>
        )}
      </PopoverContent>
    </Popover>
  );
}
