import { Badge } from "@/shared/ui/badge";
import type { RaffleStatus, RaffleVisibility } from "@/types/api";

const statusMap: Record<
  RaffleStatus,
  { label: string; variant: React.ComponentProps<typeof Badge>["variant"] }
> = {
  DRAFT: { label: "Borrador", variant: "muted" },
  PUBLISHED: { label: "Publicado", variant: "success" },
  CLOSED: { label: "Cerrado", variant: "warning" },
  CANCELLED: { label: "Cancelado", variant: "destructive" },
};

export function RaffleStatusBadge({ status }: { status: RaffleStatus }) {
  const meta = statusMap[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export function RaffleVisibilityBadge({
  visibility,
}: {
  visibility: RaffleVisibility;
}) {
  return (
    <Badge variant={visibility === "PUBLIC" ? "outline" : "muted"}>
      {visibility === "PUBLIC" ? "Público" : "Privado"}
    </Badge>
  );
}
