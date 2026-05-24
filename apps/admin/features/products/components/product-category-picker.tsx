"use client";

import { Check } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { useCategoriesList } from "@/features/categories/hooks/use-categories";
import {
  CATEGORY_GROUP_LABEL,
  type CategoryEntity,
} from "@/features/categories/types";

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
}

export function ProductCategoryPicker({ value, onChange }: Props) {
  const { data, isLoading } = useCategoriesList({
    page: 1,
    limit: 100,
    active: true,
  });
  const categories = data?.items ?? [];

  const toggle = (id: string) => {
    if (value.includes(id)) {
      onChange(value.filter((v) => v !== id));
    } else {
      onChange([...value, id]);
    }
  };

  const grouped = categories.reduce<Record<string, CategoryEntity[]>>(
    (acc, cat) => {
      const key = cat.group;
      if (!acc[key]) acc[key] = [];
      acc[key].push(cat);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Categorías</h3>
        <p className="text-xs text-muted-foreground">
          Selecciona las categorías a las que pertenece este producto.
        </p>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Cargando categorías…</p>
      ) : categories.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Aún no hay categorías activas. Crea categorías primero.
        </p>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {CATEGORY_GROUP_LABEL[group as keyof typeof CATEGORY_GROUP_LABEL] ?? group}
              </p>
              <div className="flex flex-wrap gap-2">
                {items.map((cat) => {
                  const selected = value.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggle(cat.id)}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                        selected
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-border-strong bg-transparent text-foreground hover:bg-surface-strong",
                      )}
                    >
                      {selected ? <Check className="size-3" /> : null}
                      {cat.name}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
