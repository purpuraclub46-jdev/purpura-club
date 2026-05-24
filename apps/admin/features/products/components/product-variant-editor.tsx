"use client";

import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { ProductVariantPayload } from "../types";

interface Props {
  value: ProductVariantPayload[];
  onChange: (next: ProductVariantPayload[]) => void;
}

const QUICK_VARIANTS: ProductVariantPayload[] = [
  { name: "Material", value: "Acero Dorado" },
  { name: "Material", value: "Acero Plateado" },
  { name: "Material", value: "Bañado en Oro" },
];

export function ProductVariantEditor({ value, onChange }: Props) {
  const add = () => onChange([...value, { name: "", value: "" }]);

  const remove = (index: number) =>
    onChange(value.filter((_, i) => i !== index));

  const update = (index: number, patch: Partial<ProductVariantPayload>) =>
    onChange(value.map((v, i) => (i === index ? { ...v, ...patch } : v)));

  const addQuick = (variant: ProductVariantPayload) => {
    if (
      value.some(
        (v) =>
          v.name.toLowerCase() === variant.name.toLowerCase() &&
          v.value.toLowerCase() === variant.value.toLowerCase(),
      )
    ) {
      return;
    }
    onChange([...value, variant]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Variantes</h3>
          <p className="text-xs text-muted-foreground">
            Materiales, acabados u opciones del producto.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" /> Añadir variante
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-border bg-surface/30 p-2.5">
        <span className="text-xs text-muted-foreground">
          <Sparkles className="mr-1 inline size-3" />
          Sugerencias:
        </span>
        {QUICK_VARIANTS.map((q) => (
          <Button
            key={`${q.name}-${q.value}`}
            type="button"
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs"
            onClick={() => addQuick(q)}
          >
            {q.value}
          </Button>
        ))}
      </div>

      {value.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface/30 px-4 py-8 text-center text-sm text-muted-foreground">
          Aún no hay variantes.
        </div>
      ) : (
        <ul className="space-y-2">
          {value.map((variant, index) => (
            <li
              key={index}
              className="grid grid-cols-[1fr_2fr_auto] items-center gap-2 rounded-lg border border-border bg-surface/40 p-2.5"
            >
              <Input
                placeholder="Material"
                value={variant.name}
                onChange={(e) => update(index, { name: e.target.value })}
              />
              <Input
                placeholder="Acero Dorado"
                value={variant.value}
                onChange={(e) => update(index, { value: e.target.value })}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                aria-label="Eliminar variante"
              >
                <Trash2 className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
