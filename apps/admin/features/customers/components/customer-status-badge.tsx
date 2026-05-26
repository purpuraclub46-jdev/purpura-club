"use client";

import { CheckCircle2, Crown, ShieldOff, UserCircle2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";

export function CustomerStatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
        <CheckCircle2 className="mr-1 size-3" /> Activo
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-muted text-muted-foreground">
      <ShieldOff className="mr-1 size-3" /> Inactivo
    </Badge>
  );
}

export function MembershipBadge({
  isMember,
  expiresAt,
}: {
  isMember: boolean;
  expiresAt?: string | null;
}) {
  if (isMember) {
    const exp = expiresAt ? new Date(expiresAt) : null;
    const daysLeft = exp
      ? Math.ceil((exp.getTime() - Date.now()) / 86400000)
      : null;
    return (
      <Badge variant="default" className="text-[10px]">
        <Crown className="mr-1 size-3" />
        {daysLeft != null && daysLeft <= 7
          ? `Miembro · ${daysLeft}d`
          : "Miembro"}
      </Badge>
    );
  }
  return (
    <Badge variant="muted" className="text-[10px]">
      <UserCircle2 className="mr-1 size-3" /> Visitante
    </Badge>
  );
}
