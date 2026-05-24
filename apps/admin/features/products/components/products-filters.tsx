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
import { useCategoriesList } from "@/features/categories/hooks/use-categories";
import {
  PRODUCT_SORT_LABEL,
  type ProductListQuery,
  type ProductSort,
} from "../types";

interface Props {
  value: ProductListQuery;
  onChange: (next: ProductListQuery) => void;
}

const SORTS: ProductSort[] = [
  "createdAt:desc",
  "createdAt:asc",
  "name:asc",
  "name:desc",
  "price:asc",
  "price:desc",
];

export function ProductsFilters({ value, onChange }: Props) {
  const { data } = useCategoriesList({ page: 1, limit: 100, active: true });
  const categories = data?.items ?? [];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative w-full max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre o SKU…"
          className="pl-9"
          value={value.search ?? ""}
          onChange={(e) =>
            onChange({ ...value, search: e.target.value, page: 1 })
          }
        />
      </div>

      <Select
        value={value.categoryId ?? "ALL"}
        onValueChange={(v) =>
          onChange({
            ...value,
            page: 1,
            categoryId: v === "ALL" ? undefined : v,
          })
        }
      >
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Categoría" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Todas las categorías</SelectItem>
          {categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
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
          <SelectItem value="true">Activos</SelectItem>
          <SelectItem value="false">Inactivos</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={value.sort ?? "createdAt:desc"}
        onValueChange={(v) =>
          onChange({ ...value, sort: v as ProductSort, page: 1 })
        }
      >
        <SelectTrigger className="w-56">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {SORTS.map((sort) => (
            <SelectItem key={sort} value={sort}>
              {PRODUCT_SORT_LABEL[sort]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
