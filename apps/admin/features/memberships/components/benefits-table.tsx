"use client";

import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import type { PaginationMeta } from "@/types/api";
import type { MembershipBenefitLogEntity } from "../types";
import { BenefitTypeBadge } from "./benefit-type-badge";

interface Props {
  data: MembershipBenefitLogEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function BenefitsTable({
  data,
  isLoading,
  meta,
  onPageChange,
}: Props) {
  const columns: DataTableColumn<MembershipBenefitLogEntity>[] = [
    {
      key: "createdAt",
      header: "Fecha",
      cell: (row) => (
        <span className="text-xs">{formatDate(row.createdAt)}</span>
      ),
    },
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
      key: "type",
      header: "Beneficio",
      cell: (row) => <BenefitTypeBadge type={row.type} />,
    },
    {
      key: "description",
      header: "Descripción",
      cell: (row) => <span className="text-xs">{row.description}</span>,
    },
    {
      key: "order",
      header: "Pedido",
      cell: (row) =>
        row.orderNumber ? (
          <span className="font-mono text-xs">{row.orderNumber}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "amount",
      header: "Monto",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) =>
        row.amount !== null ? (
          row.type === "RAFFLE_ENTRY" || row.type === "REFERRAL_BONUS" ? (
            <span className="text-xs">
              {row.amount} {row.amount === 1 ? "ticket" : "tickets"}
            </span>
          ) : (
            <span className="text-xs">{formatCurrency(row.amount)}</span>
          )
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <DataTable<MembershipBenefitLogEntity>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      emptyTitle="Aún no hay beneficios registrados"
      emptyDescription="Cada vez que un miembro reciba un descuento, participación o bono, aparecerá aquí."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
