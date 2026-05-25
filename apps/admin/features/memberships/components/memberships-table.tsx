"use client";

import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { formatDate } from "@/shared/lib/format";
import type { PaginationMeta } from "@/types/api";
import type { MembershipEntity } from "../types";
import { MembershipStatusBadge } from "./membership-status-badge";

interface Props {
  data: MembershipEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function MembershipsTable({
  data,
  isLoading,
  meta,
  onPageChange,
}: Props) {
  const columns: DataTableColumn<MembershipEntity>[] = [
    {
      key: "user",
      header: "Miembro",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            {row.user.firstName} {row.user.lastName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {row.user.email}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <MembershipStatusBadge
          active={row.active}
          daysRemaining={row.daysRemaining}
        />
      ),
    },
    {
      key: "startedAt",
      header: "Inicio",
      cell: (row) => (
        <span className="text-xs">{formatDate(row.startedAt)}</span>
      ),
    },
    {
      key: "expiresAt",
      header: "Vencimiento",
      cell: (row) => (
        <span className="text-xs">{formatDate(row.expiresAt)}</span>
      ),
    },
    {
      key: "daysRemaining",
      header: "Días restantes",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => {
        const days = row.daysRemaining;
        return (
          <span
            className={
              days <= 0
                ? "text-muted-foreground"
                : days <= 7
                  ? "font-medium text-amber-500"
                  : "font-medium"
            }
          >
            {days > 0 ? `${days}` : "—"}
          </span>
        );
      },
    },
    {
      key: "lastPurchaseAt",
      header: "Última compra",
      cell: (row) =>
        row.lastPurchaseAt ? (
          <span className="text-xs">{formatDate(row.lastPurchaseAt)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <DataTable<MembershipEntity>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      emptyTitle="Aún no hay miembros"
      emptyDescription="Los miembros se crean automáticamente cuando un cliente realiza una compra mayor a S/25."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
