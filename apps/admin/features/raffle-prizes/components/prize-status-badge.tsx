import { CheckCircle2, Crown, Hourglass } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import type { PrizeEntity } from "../types";

export function PrizeStatusBadge({ prize }: { prize: PrizeEntity }) {
  if (prize.winnerPublished) {
    return (
      <Badge variant="success">
        <Crown className="size-3" /> Ganador publicado
      </Badge>
    );
  }
  if (prize.winner) {
    return (
      <Badge variant="warning">
        <CheckCircle2 className="size-3" /> Ganador asignado
      </Badge>
    );
  }
  return (
    <Badge variant="muted">
      <Hourglass className="size-3" /> Pendiente
    </Badge>
  );
}
