"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { FormField } from "@/shared/ui/form-field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { useLocationsList } from "@/features/locations/hooks/use-locations";
import { LOCATION_TYPE_LABEL } from "@/features/locations/types";
import { useProductsList } from "@/features/products/hooks/use-products";
import { useCreateTransfer } from "../hooks/use-transfers";

interface ItemDraft {
  productId: string;
  quantity: number;
}

export function TransferForm() {
  const router = useRouter();
  const createMutation = useCreateTransfer();

  const { data: locsData } = useLocationsList({
    page: 1,
    limit: 100,
    active: true,
  });
  const { data: prodsData } = useProductsList({
    page: 1,
    limit: 200,
    active: true,
  });

  const locations = locsData?.items ?? [];
  const products = prodsData?.items ?? [];

  const [fromLocationId, setFromLocationId] = useState("");
  const [toLocationId, setToLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemDraft[]>([
    { productId: "", quantity: 1 },
  ]);

  const productById = useMemo(
    () => new Map(products.map((p) => [p.id, p])),
    [products],
  );

  const addItem = () =>
    setItems((prev) => [...prev, { productId: "", quantity: 1 }]);

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, patch: Partial<ItemDraft>) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    );

  const totalUnits = items.reduce(
    (sum, it) => sum + (Number.isFinite(it.quantity) ? it.quantity : 0),
    0,
  );

  const handleSubmit = async () => {
    if (!fromLocationId || !toLocationId) {
      toast.error("Selecciona origen y destino");
      return;
    }
    if (fromLocationId === toLocationId) {
      toast.error("La ubicación origen y destino deben ser distintas");
      return;
    }
    const cleanItems = items
      .filter((it) => it.productId && it.quantity > 0)
      .map((it) => ({ productId: it.productId, quantity: it.quantity }));
    if (cleanItems.length === 0) {
      toast.error("Agrega al menos un producto con cantidad mayor a 0");
      return;
    }

    try {
      const created = await createMutation.mutateAsync({
        fromLocationId,
        toLocationId,
        notes: notes.trim() || undefined,
        items: cleanItems,
      });
      toast.success("Transferencia creada");
      router.push(`/transferencias/${created.id}`);
    } catch (error) {
      toast.error("No se pudo crear la transferencia", extractErrorMessage(error));
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ruta de transferencia</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Ubicación origen" required>
                  <Select
                    value={fromLocationId}
                    onValueChange={setFromLocationId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Origen" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name} · {LOCATION_TYPE_LABEL[l.type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <FormField label="Ubicación destino" required>
                  <Select value={toLocationId} onValueChange={setToLocationId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Destino" />
                    </SelectTrigger>
                    <SelectContent>
                      {locations.map((l) => (
                        <SelectItem
                          key={l.id}
                          value={l.id}
                          disabled={l.id === fromLocationId}
                        >
                          {l.name} · {LOCATION_TYPE_LABEL[l.type]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
              </div>

              <FormField label="Notas" htmlFor="notes">
                <Textarea
                  id="notes"
                  rows={2}
                  placeholder="Reposición programada, traslado por evento, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Productos a transferir</CardTitle>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addItem}
                >
                  <Plus className="size-4" /> Añadir ítem
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {items.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border bg-surface/30 px-4 py-8 text-center text-sm text-muted-foreground">
                  Aún no agregaste productos.
                </p>
              ) : (
                items.map((item, index) => {
                  const product = productById.get(item.productId);
                  return (
                    <div
                      key={index}
                      className="grid grid-cols-[1fr_120px_auto] items-center gap-2 rounded-lg border border-border bg-surface/40 p-2.5"
                    >
                      <Select
                        value={item.productId}
                        onValueChange={(v) => updateItem(index, { productId: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona producto" />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name} ({p.sku})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(index, {
                            quantity: Number(e.target.value) || 0,
                          })
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeItem(index)}
                        aria-label="Eliminar ítem"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                      {product ? (
                        <p className="col-span-3 text-xs text-muted-foreground">
                          Stock total: {product.inventory.totalStock} ·{" "}
                          {product.sku}
                        </p>
                      ) : null}
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Resumen</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Ítems</span>
              <span className="tabular-nums">
                {items.filter((it) => it.productId && it.quantity > 0).length}
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-2 text-base font-semibold">
              <span>Unidades totales</span>
              <span className="tabular-nums">{totalUnits}</span>
            </div>
            <p className="border-t border-border pt-2 text-xs text-muted-foreground">
              La transferencia se creará en estado <strong>Pendiente</strong>.
              El stock se moverá cuando la completes desde el detalle.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border pt-6">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={createMutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={() => void handleSubmit()}
          isLoading={createMutation.isPending}
        >
          Crear transferencia
        </Button>
      </div>
    </div>
  );
}
