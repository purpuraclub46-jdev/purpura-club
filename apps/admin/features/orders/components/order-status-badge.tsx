import { Badge } from "@/shared/ui/badge";
import type { OrderPaymentMethod, OrderStatus } from "@/types/api";
import { ORDER_PAYMENT_LABEL, ORDER_STATUS_LABEL } from "../types";

const STATUS_VARIANT: Record<
  OrderStatus,
  "default" | "success" | "warning" | "destructive" | "muted"
> = {
  PENDING: "warning",
  PAID: "success",
  CANCELLED: "muted",
  REFUNDED: "destructive",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant={STATUS_VARIANT[status]}>{ORDER_STATUS_LABEL[status]}</Badge>
  );
}

export function OrderPaymentBadge({
  method,
}: {
  method: OrderPaymentMethod;
}) {
  return <Badge variant="outline">{ORDER_PAYMENT_LABEL[method]}</Badge>;
}
