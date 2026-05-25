import { Badge } from "@/shared/ui/badge";
import type { InventoryTransferStatus } from "@/types/api";
import { TRANSFER_STATUS_LABEL } from "../types";

const VARIANT: Record<
  InventoryTransferStatus,
  "warning" | "success" | "muted"
> = {
  PENDING: "warning",
  COMPLETED: "success",
  CANCELLED: "muted",
};

export function TransferStatusBadge({
  status,
}: {
  status: InventoryTransferStatus;
}) {
  return (
    <Badge variant={VARIANT[status]}>{TRANSFER_STATUS_LABEL[status]}</Badge>
  );
}
