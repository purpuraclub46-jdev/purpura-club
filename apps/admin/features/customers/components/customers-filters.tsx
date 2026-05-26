"use client";

import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { useLocationsList } from "@/features/locations/hooks/use-locations";
import type { CustomerListQuery } from "../types";

interface Props {
  query: CustomerListQuery;
  onChange: (next: CustomerListQuery) => void;
}

export function CustomersFilters({ query, onChange }: Props) {
  const { data: locationsPage } = useLocationsList({ limit: 100 });
  const locations = locationsPage?.items ?? [];

  const update = (patch: Partial<CustomerListQuery>) => {
    onChange({ ...query, ...patch, page: 1 });
  };

  const memberValue =
    query.isMember === undefined ? "" : query.isMember ? "true" : "false";
  const activeValue =
    query.active === undefined ? "" : query.active ? "true" : "false";

  return (
    <div className="grid gap-3 md:grid-cols-12">
      <div className="md:col-span-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query.search ?? ""}
            onChange={(e) => update({ search: e.target.value || undefined })}
            placeholder="Buscar por nombre, DNI, teléfono o email"
            className="pl-9"
          />
        </div>
      </div>

      <div className="md:col-span-2">
        <select
          value={memberValue}
          onChange={(e) =>
            update({
              isMember:
                e.target.value === "" ? undefined : e.target.value === "true",
            })
          }
          className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todos</option>
          <option value="true">Solo miembros</option>
          <option value="false">No miembros</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <select
          value={activeValue}
          onChange={(e) =>
            update({
              active:
                e.target.value === "" ? undefined : e.target.value === "true",
            })
          }
          className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Inactivos</option>
        </select>
      </div>

      <div className="md:col-span-2">
        <select
          value={query.primaryLocationId ?? ""}
          onChange={(e) =>
            update({ primaryLocationId: e.target.value || undefined })
          }
          className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todas las sucursales</option>
          {locations.map((loc) => (
            <option key={loc.id} value={loc.id}>
              {loc.name}
            </option>
          ))}
        </select>
      </div>

      <div className="md:col-span-2">
        <Input
          type="number"
          min={0}
          placeholder="Gasto mín. S/"
          value={query.minSpent ?? ""}
          onChange={(e) =>
            update({
              minSpent: e.target.value ? Number(e.target.value) : undefined,
            })
          }
        />
      </div>
    </div>
  );
}
