"use client";

import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import type { OrderStatus } from "@/types/api";
import {
  OrderPaymentBadge,
  OrderStatusBadge,
} from "@/features/orders/components/order-status-badge";
import {
  useOrder,
  useUpdateOrderStatus,
} from "@/features/orders/hooks/use-orders";
import { ORDER_STATUS_LABEL } from "@/features/orders/types";

const STATUSES: OrderStatus[] = ["PENDING", "PAID", "CANCELLED", "REFUNDED"];

export function OrderDetailView({ id }: { id: string }) {
  const { data: order, isLoading, isError } = useOrder(id);
  const updateStatus = useUpdateOrderStatus(id);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !order) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/pedidos">
            <ArrowLeft className="size-4" /> Volver a pedidos
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Pedido no encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleStatusChange = async (status: OrderStatus) => {
    if (status === order.status) return;
    try {
      await updateStatus.mutateAsync(status);
      toast.success("Estado actualizado");
    } catch (error) {
      toast.error("No se pudo actualizar", extractErrorMessage(error));
    }
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/pedidos">
          <ArrowLeft className="size-4" /> Volver a pedidos
        </Link>
      </Button>

      <PageHeader
        title={`Pedido ${order.number}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <OrderStatusBadge status={order.status} />
            <OrderPaymentBadge method={order.paymentMethod} />
            <span className="text-xs text-muted-foreground">
              {formatDate(order.createdAt)}
            </span>
          </span>
        }
        actions={
          <Select
            value={order.status}
            onValueChange={(v) => void handleStatusChange(v as OrderStatus)}
            disabled={updateStatus.isPending}
          >
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Precio unitario</TableHead>
                  <TableHead className="text-right">Subtotal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {order.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {item.productName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          SKU {item.productSku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(item.subtotal)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="tabular-nums">
                  {formatCurrency(order.subtotal)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Descuento</span>
                <span className="tabular-nums">
                  -{formatCurrency(order.discount)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatCurrency(order.total)}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cliente y entrega</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Cliente</p>
                {order.customer ? (
                  <p className="font-medium">{order.customer.fullName}</p>
                ) : (
                  <p className="text-muted-foreground">No registrado</p>
                )}
                {order.customer ? (
                  <p className="text-xs text-muted-foreground">
                    {order.customer.email}
                  </p>
                ) : null}
              </div>
              <div className="border-t border-border pt-2">
                <p className="text-xs text-muted-foreground">Sucursal</p>
                <p className="font-medium">
                  {order.branch ? order.branch.name : "Online"}
                </p>
              </div>
              {order.notes ? (
                <div className="border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">Notas</p>
                  <p>{order.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
