"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { PageHeader } from "@/shared/ui/page-header";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { LocationDialog } from "@/features/locations/components/location-form";
import { LocationsTable } from "@/features/locations/components/locations-table";
import { useLocationsList } from "@/features/locations/hooks/use-locations";
import {
  LOCATION_TYPE_LABEL,
  type LocationEntity,
  type LocationListQuery,
} from "@/features/locations/types";
import type { InventoryLocationType } from "@/types/api";

const TYPES: InventoryLocationType[] = ["ECOMMERCE", "SUCURSAL", "ALMACEN"];

export default function UbicacionesPage() {
  const [query, setQuery] = useState<LocationListQuery>({
    page: 1,
    limit: 30,
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<LocationEntity | null>(null);

  const { data, isLoading } = useLocationsList(query);
  const items = useMemo(() => data?.items ?? [], [data]);

  const openCreate = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const openEdit = (location: LocationEntity) => {
    setEditing(location);
    setDialogOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Ubicaciones de inventario"
        description="Ecommerce, sucursales y almacenes — cada ubicación maneja su propio stock."
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> Nueva ubicación
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar ubicación…"
            className="pl-9"
            value={query.search ?? ""}
            onChange={(e) =>
              setQuery({ ...query, search: e.target.value, page: 1 })
            }
          />
        </div>

        <Select
          value={query.type ?? "ALL"}
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              type: v === "ALL" ? undefined : (v as InventoryLocationType),
            })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todos los tipos</SelectItem>
            {TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {LOCATION_TYPE_LABEL[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={
            query.active === undefined
              ? "ALL"
              : query.active
                ? "true"
                : "false"
          }
          onValueChange={(v) =>
            setQuery({
              ...query,
              page: 1,
              active: v === "ALL" ? undefined : v === "true",
            })
          }
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Todas</SelectItem>
            <SelectItem value="true">Activas</SelectItem>
            <SelectItem value="false">Inactivas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <LocationsTable
        data={items}
        isLoading={isLoading}
        meta={data?.meta}
        onPageChange={(page) => setQuery({ ...query, page })}
        onEdit={openEdit}
      />

      <LocationDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        initial={editing}
      />
    </>
  );
}
