"use client";

import { useRouter } from "next/navigation";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import {
  OrderPaymentBadge,
  OrderStatusBadge,
} from "./order-status-badge";
import type { OrderEntity } from "../types";
import type { PaginationMeta } from "@/types/api";

interface Props {
  data: OrderEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function OrdersTable({ data, isLoading, meta, onPageChange }: Props) {
  const router = useRouter();

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
      key: "branch",
      header: "Sucursal",
      cell: (row) =>
        row.branch ? (
          row.branch.name
        ) : (
          <span className="text-xs text-muted-foreground">Online</span>
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
    <DataTable<OrderEntity>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      onRowClick={(row) => router.push(`/pedidos/${row.id}`)}
      emptyTitle="Aún no hay pedidos"
      emptyDescription="Los pedidos del ecommerce y POS aparecerán aquí."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
