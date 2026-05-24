"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/shared/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useBranchesList } from "@/features/branches/hooks/use-branches";
import { MovementsTable } from "@/features/inventory/components/movements-table";
import { useMovementsList } from "@/features/inventory/hooks/use-inventory";
import {
  MOVEMENT_TYPE_LABEL,
  type MovementListQuery,
} from "@/features/inventory/types";
import type { InventoryMovementType } from "@/types/api";

const TYPES: InventoryMovementType[] = [
  "SALE",
  "RESTOCK",
  "TRANSFER",
  "ADJUSTMENT",
  "LOSS",
];

export default function MovimientosPage() {
  const [query, setQuery] = useState<MovementListQuery>({
    page: 1,
    limit: 30,
  });

  const { data, isLoading } = useMovementsList(query);
  const { data: branchesData } = useBranchesList({ page: 1, limit: 100 });
  const branches = branchesData?.items ?? [];

  const items = useMemo(() => data?.items ?? [], [data]);

  return (
    <>
      <PageHeader
        title="Movimientos de inventario"
        description="Historial completo de ventas, ajustes, transferencias y pérdidas."
      />

      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={query.branchId ?? "ALL"}
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              branchId: v === "ALL" ? undefined : v,
            })
          }
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Sucursal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas las sucursales</SelectItem>
            {branches.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.type ?? "ALL"}
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              type: v === "ALL" ? undefined : (v as InventoryMovementType),
            })
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {MOVEMENT_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <MovementsTable
        data={items}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
      />
    </>
  );
}
