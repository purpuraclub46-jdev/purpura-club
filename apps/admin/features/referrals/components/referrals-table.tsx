"use client";

import { ArrowRight, Check, Clock } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { formatDate } from "@/shared/lib/format";
import type { PaginationMeta } from "@/types/api";
import type { ReferralEntity } from "../types";

interface Props {
  data: ReferralEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function ReferralsTable({
  data,
  isLoading,
  meta,
  onPageChange,
}: Props) {
  const columns: DataTableColumn<ReferralEntity>[] = [
    {
      key: "referrer",
      header: "Referente",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            {row.referrer.firstName} {row.referrer.lastName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {row.referrer.email}
          </span>
        </div>
      ),
    },
    {
      key: "arrow",
      header: "",
      headClassName: "w-6",
      className: "text-muted-foreground",
      cell: () => <ArrowRight className="size-4" />,
    },
    {
      key: "referred",
      header: "Referido",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            {row.referred.firstName} {row.referred.lastName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {row.referred.email}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Recompensa",
      cell: (row) =>
        row.rewarded ? (
          <Badge variant="success">
            <Check className="size-3" /> Otorgada
          </Badge>
        ) : (
          <Badge variant="muted">
            <Clock className="size-3" /> Pendiente
          </Badge>
        ),
    },
    {
      key: "createdAt",
      header: "Invitación",
      cell: (row) => (
        <span className="text-xs">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "rewardedAt",
      header: "Fecha recompensa",
      cell: (row) =>
        row.rewardedAt ? (
          <span className="text-xs">{formatDate(row.rewardedAt)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <DataTable<ReferralEntity>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      emptyTitle="Aún no hay referidos"
      emptyDescription="Cuando un usuario invite a otro y este realice su primera compra elegible, aparecerá aquí."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
