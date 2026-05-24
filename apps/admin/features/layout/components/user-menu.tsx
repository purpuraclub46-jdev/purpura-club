"use client";

import { LogOut, User } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { useAuth } from "@/features/auth/hooks/use-auth";

const initials = (firstName: string, lastName: string): string =>
  `${firstName?.[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase() || "PP";

export function UserMenu() {
  const { user, logout } = useAuth();

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full border border-border bg-surface/60 px-2 py-1.5 text-left transition-colors hover:bg-surface-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-xs font-semibold text-primary-foreground">
            {initials(user.firstName, user.lastName)}
          </span>
          <span className="hidden flex-col leading-tight sm:flex">
            <span className="text-xs font-medium text-foreground">
              {user.firstName} {user.lastName}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {user.role.replace("_", " ")}
            </span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <User className="size-4" />
          Perfil (próximamente)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(e) => {
            e.preventDefault();
            void logout();
          }}
          className="text-destructive focus:text-destructive"
        >
          <LogOut className="size-4" />
          Cerrar sesión
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export { Button };
