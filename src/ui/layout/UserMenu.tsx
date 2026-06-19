/**
 * UserMenu — identity dropdown. Receives the user from ShellProvider; no
 * auth coupling inside the Shell.
 */
import { LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useShellUser } from "../providers/shell-services";

export interface UserMenuProps {
  onSignOut?: () => void;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
}

export function UserMenu({
  onSignOut,
  onOpenProfile,
  onOpenSettings,
}: UserMenuProps) {
  const user = useShellUser();
  const initials =
    user?.initials ??
    user?.name
      ?.split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ??
    "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={user ? `Account menu for ${user.name}` : "Account menu"}
      >
        {initials}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {user && (
          <>
            <DropdownMenuLabel>
              <div className="truncate text-sm">{user.name}</div>
              {user.email && (
                <div className="truncate text-xs text-muted-foreground">
                  {user.email}
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem onClick={onOpenProfile} disabled={!onOpenProfile}>
          <User className="me-2 size-4" aria-hidden="true" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onOpenSettings} disabled={!onOpenSettings}>
          <Settings className="me-2 size-4" aria-hidden="true" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onSignOut} disabled={!onSignOut}>
          <LogOut className="me-2 size-4" aria-hidden="true" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
