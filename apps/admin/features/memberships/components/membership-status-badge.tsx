import { CircleCheck, CircleOff, TimerReset } from "lucide-react";
import { Badge } from "@/shared/ui/badge";

interface Props {
  active: boolean;
  daysRemaining: number;
}

export function MembershipStatusBadge({ active, daysRemaining }: Props) {
  if (!active) {
    return (
      <Badge variant="muted">
        <CircleOff className="size-3" /> Expirada
      </Badge>
    );
  }
  if (daysRemaining <= 7) {
    return (
      <Badge variant="warning">
        <TimerReset className="size-3" /> Por vencer
      </Badge>
    );
  }
  return (
    <Badge variant="success">
      <CircleCheck className="size-3" /> Activa
    </Badge>
  );
}
