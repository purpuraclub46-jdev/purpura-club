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
import type { CategoryListQuery } from "../types";

interface Props {
  value: CategoryListQuery;
  onChange: (next: CategoryListQuery) => void;
}

export function CategoriesFilters({ value, onChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar categoría…"
          className="pl-9"
          value={value.search ?? ""}
          onChange={(e) =>
            onChange({ ...value, search: e.target.value, page: 1 })
          }
        />
      </div>

      <Select
        value={value.group ?? "ALL"}
        onValueChange={(v) =>
          onChange({
            ...value,
            page: 1,
            group: v === "ALL" ? undefined : (v as CategoryListQuery["group"]),
          })
        }
      >
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Grupo" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos los grupos</SelectItem>
          <SelectItem value="JOYERIA">Joyería</SelectItem>
          <SelectItem value="PERFUMES">Perfumes</SelectItem>
          <SelectItem value="ACCESORIOS">Accesorios</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={
          value.active === undefined ? "ALL" : value.active ? "true" : "false"
        }
        onValueChange={(v) =>
          onChange({
            ...value,
            page: 1,
            active: v === "ALL" ? undefined : v === "true",
          })
        }
      >
        <SelectTrigger className="w-36">
          <SelectValue placeholder="Estado" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todos</SelectItem>
          <SelectItem value="true">Activas</SelectItem>
          <SelectItem value="false">Inactivas</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
