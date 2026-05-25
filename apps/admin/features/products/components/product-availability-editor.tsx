"use client";

import { Loader2 } from "lucide-react";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { useLocationsList } from "@/features/locations/hooks/use-locations";
import { LocationTypeBadge } from "@/features/locations/components/location-type-badge";
import type { ProductAvailabilityPayload } from "../types";

interface Props {
  value: ProductAvailabilityPayload[];
  onChange: (next: ProductAvailabilityPayload[]) => void;
  /** Si es true, oculta el input de stock inicial (modo edición). */
  hideInitialStock?: boolean;
}

export function ProductAvailabilityEditor({
  value,
  onChange,
  hideInitialStock = false,
}: Props) {
  const { data, isLoading } = useLocationsList({
    page: 1,
    limit: 100,
    active: true,
  });
  const locations = data?.items ?? [];

  const byId = new Map(value.map((v) => [v.inventoryLocationId, v]));

  const upsert = (
    inventoryLocationId: string,
    patch: Partial<ProductAvailabilityPayload>,
  ) => {
    const existing = byId.get(inventoryLocationId);
    if (existing) {
      onChange(
        value.map((v) =>
          v.inventoryLocationId === inventoryLocationId
            ? { ...v, ...patch }
            : v,
        ),
      );
      return;
    }
    onChange([
      ...value,
      {
        inventoryLocationId,
        active: true,
        initialStock: 0,
        minimumStock: 0,
        ...patch,
      },
    ]);
  };

  const remove = (inventoryLocationId: string) => {
    onChange(value.filter((v) => v.inventoryLocationId !== inventoryLocationId));
  };

  const toggleActive = (
    inventoryLocationId: string,
    next: boolean,
  ) => {
    if (next) {
      upsert(inventoryLocationId, { active: true });
    } else {
      // Mantenemos la fila pero la marcamos como inactiva si el usuario quiere
      // conservar el stock mínimo configurado. Si nunca existía, no se crea.
      const existing = byId.get(inventoryLocationId);
      if (existing) {
        upsert(inventoryLocationId, { active: false });
      } else {
        remove(inventoryLocationId);
      }
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">Disponibilidad por ubicación</h3>
        <p className="text-xs text-muted-foreground">
          Selecciona las ubicaciones donde el producto estará disponible. El POS
          y el ecommerce solo mostrarán el producto en las ubicaciones
          habilitadas.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-3 animate-spin" />
          Cargando ubicaciones…
        </div>
      ) : locations.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface/30 px-4 py-6 text-center text-xs text-muted-foreground">
          Aún no hay ubicaciones activas. Crea una en{" "}
          <span className="font-medium">Ubicaciones</span> antes de continuar.
        </div>
      ) : (
        <ul className="space-y-2">
          {locations.map((loc) => {
            const entry = byId.get(loc.id);
            const enabled = entry?.active ?? false;
            return (
              <li
                key={loc.id}
                className="rounded-lg border border-border bg-surface/40 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Switch
                      checked={enabled}
                      onCheckedChange={(checked) =>
                        toggleActive(loc.id, checked)
                      }
                      aria-label={`Disponibilidad en ${loc.name}`}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{loc.name}</p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <LocationTypeBadge type={loc.type} />
                        {loc.address ? (
                          <span className="truncate text-xs text-muted-foreground">
                            {loc.address}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>

                {enabled ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {hideInitialStock ? null : (
                      <label className="space-y-1">
                        <span className="text-xs font-medium text-muted-foreground">
                          Stock inicial
                        </span>
                        <Input
                          type="number"
                          min={0}
                          value={entry?.initialStock ?? 0}
                          onChange={(e) =>
                            upsert(loc.id, {
                              initialStock: Number(e.target.value) || 0,
                            })
                          }
                        />
                      </label>
                    )}
                    <label className="space-y-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        Stock mínimo
                      </span>
                      <Input
                        type="number"
                        min={0}
                        value={entry?.minimumStock ?? 0}
                        onChange={(e) =>
                          upsert(loc.id, {
                            minimumStock: Number(e.target.value) || 0,
                          })
                        }
                      />
                    </label>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
