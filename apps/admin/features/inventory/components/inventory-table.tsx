"use client";

import { Settings2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { LocationTypeBadge } from "@/features/locations/components/location-type-badge";
import type { StockRow } from "../types";
import type { PaginationMeta } from "@/types/api";
import { StockLevelBadge } from "./stock-level-badge";

interface Props {
  data: StockRow[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  onAdjust: (row: StockRow) => void;
}

export function InventoryTable({
  data,
  isLoading,
  meta,
  onPageChange,
  onAdjust,
}: Props) {
  const columns: DataTableColumn<StockRow>[] = [
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
      key: "stock",
      header: "Stock",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <span
          className={
            row.stockLevel === "OUT_OF_STOCK"
              ? "text-destructive"
              : row.stockLevel === "LOW"
                ? "text-warning"
                : ""
          }
        >
          {row.stock.toLocaleString("es-PE")}
        </span>
      ),
    },
    {
      key: "reserved",
      header: "Reservado",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) =>
        row.reservedStock > 0 ? (
          row.reservedStock.toLocaleString("es-PE")
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "available",
      header: "Disponible",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <span className="font-medium">
          {row.availableStock.toLocaleString("es-PE")}
        </span>
      ),
    },
    {
      key: "minimum",
      header: "Mínimo",
      headClassName: "text-right",
      className: "text-right tabular-nums text-xs text-muted-foreground",
      cell: (row) => row.minimumStock.toLocaleString("es-PE"),
    },
    {
      key: "level",
      header: "Nivel",
      cell: (row) => <StockLevelBadge level={row.stockLevel} />,
    },
    {
      key: "actions",
      header: "",
      headClassName: "w-12",
      cell: (row) => (
        <Button
          variant="ghost"
          size="icon"
          onClick={(e) => {
            e.stopPropagation();
            onAdjust(row);
          }}
          aria-label="Ajustar stock"
        >
          <Settings2 className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <DataTable<StockRow>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      onRowClick={(row) => onAdjust(row)}
      emptyTitle="Aún no hay inventario registrado"
      emptyDescription="Crea ubicaciones y productos, y ajusta su stock para comenzar."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
