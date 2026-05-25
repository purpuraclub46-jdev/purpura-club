import { Badge } from "@/shared/ui/badge";
import type { InventoryMovementType } from "@/types/api";
import { MOVEMENT_TYPE_LABEL } from "../types";

const VARIANT: Record<
  InventoryMovementType,
  "default" | "success" | "warning" | "destructive" | "muted" | "outline"
> = {
  SALE: "default",
  RESTOCK: "success",
  TRANSFER_OUT: "muted",
  TRANSFER_IN: "outline",
  ADJUSTMENT: "warning",
  LOSS: "destructive",
  RESERVATION: "outline",
};

export function MovementTypeBadge({ type }: { type: InventoryMovementType }) {
  return <Badge variant={VARIANT[type]}>{MOVEMENT_TYPE_LABEL[type]}</Badge>;
}
