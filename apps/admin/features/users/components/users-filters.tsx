"use client";

import { Search } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { useLocationsList } from "@/features/locations/hooks/use-locations";
import { useRolesList } from "@/features/roles/hooks/use-rbac";
import type { UserListQuery } from "../types";

interface Props {
  query: UserListQuery;
  onChange: (next: UserListQuery) => void;
}

export function UsersFilters({ query, onChange }: Props) {
  const { data: locationsPage } = useLocationsList({ limit: 100 });
  const { data: rolesPage } = useRolesList({ limit: 100, active: true });

  const locations = locationsPage?.items ?? [];
  const roles = rolesPage?.items ?? [];

  const handleSearch = (search: string) => {
    onChange({ ...query, search: search || undefined, page: 1 });
  };

  const handleLocation = (id: string) => {
    onChange({
      ...query,
      inventoryLocationId: id || undefined,
      page: 1,
    });
  };

  const handleRole = (slug: string) => {
    onChange({ ...query, roleSlug: slug || undefined, page: 1 });
  };

  const handleActive = (value: string) => {
    onChange({
      ...query,
      active: value === "" ? undefined : value === "true",
      page: 1,
    });
  };

  return (
    <div className="grid gap-3 md:grid-cols-12">
      <div className="md:col-span-5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query.search ?? ""}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por nombre, email o DNI"
            className="pl-9"
          />
        </div>
      </div>
      <div className="md:col-span-3">
        <select
          value={query.roleSlug ?? ""}
          onChange={(e) => handleRole(e.target.value)}
          className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todos los roles</option>
          {roles.map((r) => (
            <option key={r.id} value={r.slug}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div className="md:col-span-2">
        <select
          value={query.inventoryLocationId ?? ""}
          onChange={(e) => handleLocation(e.target.value)}
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
        <select
          value={
            query.active === undefined ? "" : query.active ? "true" : "false"
          }
          onChange={(e) => handleActive(e.target.value)}
          className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
        >
          <option value="">Todos los estados</option>
          <option value="true">Activos</option>
          <option value="false">Desactivados</option>
        </select>
      </div>
    </div>
  );
}
