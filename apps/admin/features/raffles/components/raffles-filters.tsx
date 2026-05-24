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
import type { RaffleListQuery } from "@/features/raffles/types";

interface RafflesFiltersProps {
  value: RaffleListQuery;
  onChange: (next: RaffleListQuery) => void;
}

export function RafflesFilters({ value, onChange }: RafflesFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por título o slug…"
          className="pl-9"
          value={value.search ?? ""}
          onChange={(e) =>
            onChange({ ...value, search: e.target.value, page: 1 })
          }
        />
      </div>

      <Select
        value={value.status ?? "ALL"}
        onValueChange={(v) =>
          onChange({
            ...value,
            page: 1,
            status: v === "ALL" ? undefined : (v as RaffleListQuery["status"]),
          })
        }
      >
        <SelectTrigger className="w-40">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos los estados</SelectItem>
          <SelectItem value="DRAFT">Borrador</SelectItem>
          <SelectItem value="PUBLISHED">Publicado</SelectItem>
          <SelectItem value="CLOSED">Cerrado</SelectItem>
          <SelectItem value="CANCELLED">Cancelado</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.timeFilter ?? "all"}
        onValueChange={(v) =>
          onChange({
            ...value,
            page: 1,
            timeFilter: v as RaffleListQuery["timeFilter"],
          })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Cuándo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Cualquier fecha</SelectItem>
          <SelectItem value="upcoming">Próximos</SelectItem>
          <SelectItem value="past">Pasados</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
