"use client";

import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { LocationTypeBadge } from "@/features/locations/components/location-type-badge";
import {
  OrderPaymentBadge,
  OrderStatusBadge,
} from "@/features/orders/components/order-status-badge";
import { useOrdersList } from "@/features/orders/hooks/use-orders";
import type { OrderEntity } from "@/features/orders/types";

export function MercadoPagoPanel() {
  const router = useRouter();
  const { data, isLoading } = useOrdersList({
    page: 1,
    limit: 50,
    paymentMethod: "MERCADOPAGO",
  });

  const columns: DataTableColumn<OrderEntity>[] = [
    {
      key: "number",
      header: "Pedido",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-mono text-xs font-medium">
            {row.number}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {formatDate(row.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "customer",
      header: "Cliente",
      cell: (row) =>
        row.customer ? (
          <div className="flex min-w-0 flex-col">
            <span className="truncate font-medium">{row.customer.fullName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {row.customer.email}
            </span>
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">
            Sin cliente registrado
          </span>
        ),
    },
    {
      key: "location",
      header: "Ubicación",
      cell: (row) =>
        row.location ? (
          <div className="flex flex-col gap-1">
            <span className="truncate text-xs">{row.location.name}</span>
            <LocationTypeBadge type={row.location.type} />
          </div>
        ) : (
          <span className="text-xs text-muted-foreground">Sin ubicación</span>
        ),
    },
    {
      key: "items",
      header: "Ítems",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) =>
        row.items.reduce((sum, item) => sum + item.quantity, 0),
    },
    {
      key: "total",
      header: "Total",
      headClassName: "text-right",
      className: "text-right tabular-nums font-medium",
      cell: (row) => formatCurrency(row.total),
    },
    {
      key: "payment",
      header: "Pago",
      cell: (row) => <OrderPaymentBadge method={row.paymentMethod} />,
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <OrderStatusBadge status={row.status} />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>MercadoPago — pagos automáticos del ecommerce</CardTitle>
        <CardDescription>
          Canal exclusivo para pedidos de <em>joyería, perfumes y accesorios</em>.
          El estado se actualiza automáticamente vía webhooks; los sorteos NO se
          pagan por MercadoPago.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable<OrderEntity>
          data={data?.items ?? []}
          columns={columns}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          onRowClick={(row) => router.push(`/pedidos/${row.id}`)}
          emptyTitle="Sin pedidos MercadoPago"
          emptyDescription="Aún no se han procesado pedidos del ecommerce vía MercadoPago."
          meta={data?.meta}
        />
      </CardContent>
    </Card>
  );
}
