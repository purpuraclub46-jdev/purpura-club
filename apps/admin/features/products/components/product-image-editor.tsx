"use client";

import { ImageOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import type { ProductImagePayload } from "../types";

interface Props {
  value: ProductImagePayload[];
  onChange: (next: ProductImagePayload[]) => void;
}

export function ProductImageEditor({ value, onChange }: Props) {
  const add = () =>
    onChange([...value, { url: "", order: value.length }]);

  const remove = (index: number) =>
    onChange(
      value
        .filter((_, i) => i !== index)
        .map((img, i) => ({ ...img, order: i })),
    );

  const update = (index: number, patch: Partial<ProductImagePayload>) =>
    onChange(value.map((img, i) => (i === index ? { ...img, ...patch } : img)));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Imágenes</h3>
          <p className="text-xs text-muted-foreground">
            La primera imagen se usará como portada.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="size-4" /> Añadir imagen
        </Button>
      </div>

      {value.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-surface/30 px-4 py-10 text-center text-sm text-muted-foreground">
          <ImageOff className="mb-2 size-5" />
          Aún no hay imágenes.
        </div>
      ) : (
        <ul className="space-y-2">
          {value.map((img, index) => (
            <li
              key={index}
              className="flex items-center gap-3 rounded-lg border border-border bg-surface/40 p-2.5"
            >
              <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface-strong">
                {img.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt={`Imagen ${index + 1}`}
                    className="absolute inset-0 size-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground">
                    <ImageOff className="size-4" />
                  </div>
                )}
              </div>
              <Input
                type="url"
                placeholder="https://…"
                value={img.url}
                onChange={(e) => update(index, { url: e.target.value })}
              />
              <Input
                type="number"
                className="w-20"
                min={0}
                value={img.order}
                onChange={(e) =>
                  update(index, { order: Number(e.target.value) || 0 })
                }
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                aria-label="Eliminar imagen"
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
