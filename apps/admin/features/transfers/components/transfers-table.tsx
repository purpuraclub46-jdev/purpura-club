"use client";

import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { formatDate } from "@/shared/lib/format";
import { LocationTypeBadge } from "@/features/locations/components/location-type-badge";
import type { TransferEntity } from "../types";
import type { PaginationMeta } from "@/types/api";
import { TransferStatusBadge } from "./transfer-status-badge";

interface Props {
  data: TransferEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function TransfersTable({
  data,
  isLoading,
  meta,
  onPageChange,
}: Props) {
  const router = useRouter();

  const columns: DataTableColumn<TransferEntity>[] = [
    {
      key: "number",
      header: "Transferencia",
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
      key: "route",
      header: "Origen → Destino",
      cell: (row) => (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="truncate">{row.fromLocation.name}</span>
            <LocationTypeBadge type={row.fromLocation.type} />
          </div>
          <ArrowRight className="size-3 text-muted-foreground" />
          <div className="flex flex-col gap-0.5">
            <span className="truncate">{row.toLocation.name}</span>
            <LocationTypeBadge type={row.toLocation.type} />
          </div>
        </div>
      ),
    },
    {
      key: "items",
      header: "Ítems",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => row.items.length,
    },
    {
      key: "total",
      header: "Unidades",
      headClassName: "text-right",
      className: "text-right tabular-nums font-medium",
      cell: (row) => row.totalQuantity.toLocaleString("es-PE"),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <TransferStatusBadge status={row.status} />,
    },
    {
      key: "actor",
      header: "Creada por",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.createdByUserName ?? "Sistema"}
        </span>
      ),
    },
  ];

  return (
    <DataTable<TransferEntity>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      onRowClick={(row) => router.push(`/transferencias/${row.id}`)}
      emptyTitle="Aún no hay transferencias"
      emptyDescription="Mueve stock entre ubicaciones para abastecer sucursales o el ecommerce."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
