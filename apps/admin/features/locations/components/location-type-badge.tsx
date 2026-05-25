import { Globe, Store, Warehouse } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import type { InventoryLocationType } from "@/types/api";
import { LOCATION_TYPE_LABEL } from "../types";

const VARIANT: Record<
  InventoryLocationType,
  "default" | "success" | "warning" | "muted"
> = {
  ECOMMERCE: "default",
  SUCURSAL: "success",
  ALMACEN: "warning",
};

const ICON: Record<InventoryLocationType, typeof Globe> = {
  ECOMMERCE: Globe,
  SUCURSAL: Store,
  ALMACEN: Warehouse,
};

export function LocationTypeBadge({
  type,
}: {
  type: InventoryLocationType;
}) {
  const Icon = ICON[type];
  return (
    <Badge variant={VARIANT[type]}>
      <Icon className="size-3" />
      {LOCATION_TYPE_LABEL[type]}
    </Badge>
  );
}
