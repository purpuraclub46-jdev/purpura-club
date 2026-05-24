"use client";

import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { useBranchesList } from "@/features/branches/hooks/use-branches";
import type { InventoryListQuery } from "../types";

interface Props {
  value: InventoryListQuery;
  onChange: (next: InventoryListQuery) => void;
}

export function InventoryFilters({ value, onChange }: Props) {
  const { data } = useBranchesList({ page: 1, limit: 100 });
  const branches = data?.items ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar producto o SKU…"
          className="pl-9"
          value={value.search ?? ""}
          onChange={(e) =>
            onChange({ ...value, search: e.target.value, page: 1 })
          }
        />
      </div>

      <Select
        value={value.branchId ?? "ALL"}
        onValueChange={(v) =>
          onChange({
            ...value,
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
        value={value.lowStockOnly ? "low" : "all"}
        onValueChange={(v) =>
          onChange({ ...value, page: 1, lowStockOnly: v === "low" })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todo el stock</SelectItem>
          <SelectItem value="low">Stock bajo (≤ 5)</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
