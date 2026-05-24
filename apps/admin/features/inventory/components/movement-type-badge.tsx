import { Badge } from "@/shared/ui/badge";
import type { InventoryMovementType } from "@/types/api";
import { MOVEMENT_TYPE_LABEL } from "../types";

const VARIANT: Record<
  InventoryMovementType,
  "default" | "success" | "warning" | "destructive" | "muted"
> = {
  SALE: "default",
  RESTOCK: "success",
  TRANSFER: "muted",
  ADJUSTMENT: "warning",
  LOSS: "destructive",
};

export function MovementTypeBadge({ type }: { type: InventoryMovementType }) {
  return <Badge variant={VARIANT[type]}>{MOVEMENT_TYPE_LABEL[type]}</Badge>;
}
