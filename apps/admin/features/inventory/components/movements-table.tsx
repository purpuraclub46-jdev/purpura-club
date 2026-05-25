"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { formatDate } from "@/shared/lib/format";
import { LocationTypeBadge } from "@/features/locations/components/location-type-badge";
import { MovementTypeBadge } from "./movement-type-badge";
import type { InventoryMovementEntity } from "../types";
import type { PaginationMeta } from "@/types/api";

interface Props {
  data: InventoryMovementEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function MovementsTable({ data, isLoading, meta, onPageChange }: Props) {
  const columns: DataTableColumn<InventoryMovementEntity>[] = [
    {
      key: "date",
      header: "Fecha",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {formatDate(row.createdAt)}
        </span>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      cell: (row) => <MovementTypeBadge type={row.type} />,
    },
    {
      key: "product",
      header: "Producto",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{row.productName}</span>
          <span className="truncate text-xs text-muted-foreground">
            SKU {row.productSku}
          </span>
        </div>
      ),
    },
    {
      key: "location",
      header: "Ubicación",
      cell: (row) => (
        <div className="flex flex-col gap-1">
          <span className="truncate">{row.locationName}</span>
          <LocationTypeBadge type={row.locationType} />
        </div>
      ),
    },
    {
      key: "quantity",
      header: "Cantidad",
      headClassName: "text-right",
      className: "text-right tabular-nums font-medium",
      cell: (row) => (
        <span
          className={
            row.quantity > 0
              ? "text-success"
              : row.quantity < 0
                ? "text-destructive"
                : ""
          }
        >
          {row.quantity > 0 ? "+" : ""}
          {row.quantity}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Motivo",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.transferNumber ? (
            <Link
              href={`/transferencias/${row.transferId}`}
              className="text-foreground hover:text-primary"
            >
              {row.transferNumber}
            </Link>
          ) : (
            (row.reason ?? "—")
          )}
        </span>
      ),
    },
    {
      key: "actor",
      header: "Por",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.createdByUserName ?? "Sistema"}
        </span>
      ),
    },
  ];

  return (
    <DataTable<InventoryMovementEntity>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      emptyTitle="Aún no hay movimientos"
      emptyDescription="Los ajustes, transferencias, ventas y reservas aparecerán aquí."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
