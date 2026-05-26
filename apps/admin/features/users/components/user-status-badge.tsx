"use client";

import { CheckCircle2, ShieldOff } from "lucide-react";
import { Badge } from "@/shared/ui/badge";

export function UserStatusBadge({ active }: { active: boolean }) {
  if (active) {
    return (
      <Badge variant="outline" className="border-emerald-500/40 text-emerald-300">
        <CheckCircle2 className="mr-1 size-3" /> Activo
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-muted text-muted-foreground">
      <ShieldOff className="mr-1 size-3" /> Desactivado
    </Badge>
  );
}
