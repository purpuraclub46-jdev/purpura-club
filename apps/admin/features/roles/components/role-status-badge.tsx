"use client";

import { ShieldCheck, ShieldOff, Sparkles } from "lucide-react";
import { Badge } from "@/shared/ui/badge";

export function RoleStatusBadge({
  active,
  isOfficial,
}: {
  active: boolean;
  isOfficial: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {active ? (
        <Badge
          variant="outline"
          className="border-emerald-500/40 text-emerald-300"
        >
          <ShieldCheck className="mr-1 size-3" /> Activo
        </Badge>
      ) : (
        <Badge variant="outline" className="border-muted text-muted-foreground">
          <ShieldOff className="mr-1 size-3" /> Desactivado
        </Badge>
      )}
      {isOfficial ? (
        <Badge variant="default" className="text-[10px]">
          <Sparkles className="mr-1 size-3" /> Oficial
        </Badge>
      ) : null}
    </div>
  );
}
