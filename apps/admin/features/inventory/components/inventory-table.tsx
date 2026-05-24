"use client";

import { Settings2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import type { InventoryRow } from "../types";
import type { PaginationMeta } from "@/types/api";

interface Props {
  data: InventoryRow[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  onAdjust: (row: InventoryRow) => void;
}

export function InventoryTable({
  data,
  isLoading,
  meta,
  onPageChange,
  onAdjust,
}: Props) {
  const columns: DataTableColumn<InventoryRow>[] = [
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
      key: "branch",
      header: "Sucursal",
      cell: (row) => <span className="truncate">{row.branchName}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <span className={row.stock <= 5 ? "text-warning" : ""}>
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
      key: "level",
      header: "Nivel",
      cell: (row) => {
        if (row.stock === 0) {
          return <Badge variant="destructive">Sin stock</Badge>;
        }
        if (row.stock <= 5) {
          return <Badge variant="warning">Stock bajo</Badge>;
        }
        return <Badge variant="success">Disponible</Badge>;
      },
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
    <DataTable<InventoryRow>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      onRowClick={(row) => onAdjust(row)}
      emptyTitle="Aún no hay inventario registrado"
      emptyDescription="Crea sucursales y productos, y ajusta su stock para comenzar."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
