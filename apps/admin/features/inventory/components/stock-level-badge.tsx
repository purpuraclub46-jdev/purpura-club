import { Badge } from "@/shared/ui/badge";
import type { StockLevel } from "@/types/api";
import { STOCK_LEVEL_LABEL } from "../types";

const VARIANT: Record<StockLevel, "success" | "warning" | "destructive"> = {
  OK: "success",
  LOW: "warning",
  OUT_OF_STOCK: "destructive",
};

export function StockLevelBadge({ level }: { level: StockLevel }) {
  return <Badge variant={VARIANT[level]}>{STOCK_LEVEL_LABEL[level]}</Badge>;
}
