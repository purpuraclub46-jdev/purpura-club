"use client";

import { useMemo, useState } from "react";
import { Plus, ScanLine, Search } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Input } from "@/shared/ui/input";
import { formatCurrency } from "@/shared/lib/format";
import { useProductsList } from "@/features/products/hooks/use-products";
import type { ProductEntity } from "@/features/products/types";

interface Props {
  locationId: string;
  onAdd: (product: ProductEntity) => void;
}

/**
 * Grid de productos del POS. Lee el catálogo filtrado por sucursal y permite
 * búsqueda por nombre/SKU/barcode. El input acepta lecturas de scanner —
 * cualquier teclado HID que termine con Enter envía el código.
 */
export function ProductSearch({ locationId, onAdd }: Props) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useProductsList({
    limit: 60,
    active: true,
    inventoryLocationId: locationId,
    search: search.trim() || undefined,
    sort: "name:asc",
  });

  const items = data?.items ?? [];

  // Cuando el scanner ingresa un código exacto (SKU/barcode match único),
  // se autoagrega y se limpia el input — patrón clásico de POS.
  const exact = useMemo<ProductEntity | null>(() => {
    const term = search.trim().toUpperCase();
    if (term.length < 4) return null;
    const matched = items.find(
      (p) => p.sku.toUpperCase() === term || (p.barcode && p.barcode === term),
    );
    return matched ?? null;
  }, [search, items]);

  const handleScannerSubmit = () => {
    if (exact) {
      onAdd(exact);
      setSearch("");
    }
  };

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="relative">
        <ScanLine className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleScannerSubmit();
            }
          }}
          placeholder="Buscar o escanear (nombre, SKU, código de barras)"
          className="h-12 pl-9 text-base"
          autoFocus
        />
        <Search className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/50" />
      </div>

      <div className="grid flex-1 auto-rows-max grid-cols-2 gap-2.5 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-xl border border-[#11111111] bg-[#FAFAFA]"
              />
            ))
          : items.length === 0
            ? (
                <div className="col-span-full rounded-xl border border-dashed border-[#11111118] bg-[#FAFAFA] p-8 text-center text-sm text-[#0A0A0A]/50">
                  No hay productos para mostrar.
                </div>
              )
            : items.map((p) => {
                const stockEntry = p.availability.find(
                  (a) => a.inventoryLocationId === locationId,
                );
                const stock = stockEntry?.stock ?? 0;
                const lowStock = stockEntry
                  ? stock <= (stockEntry.minimumStock ?? 0) && stock > 0
                  : false;
                const out = stock <= 0;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={out}
                    onClick={() => onAdd(p)}
                    className={cn(
                      "lux-card group relative flex flex-col gap-1 rounded-xl p-3 text-left transition-all duration-150",
                      out
                        ? "cursor-not-allowed opacity-50"
                        : "hover:-translate-y-0.5 hover:border-[#9810FA]/30 hover:shadow-[0_14px_30px_-14px_rgba(152,16,250,0.35)]",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[9px] font-semibold tabular-nums",
                          out
                            ? "bg-rose-50 text-rose-600"
                            : lowStock
                              ? "bg-amber-50 text-amber-700"
                              : "bg-emerald-50 text-emerald-700",
                        )}
                      >
                        Stock {stock}
                      </span>
                      <Plus
                        className={cn(
                          "size-4 shrink-0 opacity-0 transition-opacity",
                          !out && "group-hover:opacity-100 text-[#9810FA]",
                        )}
                      />
                    </div>
                    <p className="line-clamp-2 text-xs font-medium leading-tight text-[#0A0A0A]">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-[#0A0A0A]/45">SKU {p.sku}</p>
                    <p className="mt-auto text-sm font-semibold tabular-nums text-[#0A0A0A]">
                      {formatCurrency(p.finalPrice)}
                    </p>
                    {p.discountActive ? (
                      <p className="text-[10px] text-[#0A0A0A]/45 line-through">
                        {formatCurrency(p.price)}
                      </p>
                    ) : null}
                  </button>
                );
              })}
      </div>

      <p className="text-[10px] text-[#0A0A0A]/45">
        Tip: tras escanear el código, presiona Enter para agregar.
      </p>
    </div>
  );
}
