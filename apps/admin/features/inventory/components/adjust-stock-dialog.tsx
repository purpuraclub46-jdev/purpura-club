"use client";

import { useEffect, useState } from "react";
import { Button } from "@/shared/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import {
  useAdjustStock,
  useSetMinimumStock,
} from "../hooks/use-inventory";
import {
  MOVEMENT_TYPE_LABEL,
  type AdjustStockPayload,
  type StockRow,
} from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: StockRow | null;
}

type AdjustType = AdjustStockPayload["type"];
const ALLOWED_TYPES: AdjustType[] = ["RESTOCK", "ADJUSTMENT", "LOSS"];

export function AdjustStockDialog({ open, onOpenChange, row }: Props) {
  const adjust = useAdjustStock();
  const setMin = useSetMinimumStock();

  const [quantity, setQuantity] = useState(0);
  const [type, setType] = useState<AdjustType>("RESTOCK");
  const [reason, setReason] = useState("");
  const [minimumStock, setMinimumStock] = useState(0);

  useEffect(() => {
    if (open && row) {
      setQuantity(0);
      setType("RESTOCK");
      setReason("");
      setMinimumStock(row.minimumStock);
    }
  }, [open, row]);

  if (!row) return null;

  const nextStock = row.stock + quantity;
  const isInvalid = nextStock < 0;

  const handleSubmit = async () => {
    if (quantity === 0 && minimumStock === row.minimumStock) {
      onOpenChange(false);
      return;
    }
    try {
      if (quantity !== 0) {
        await adjust.mutateAsync({
          inventoryLocationId: row.inventoryLocationId,
          productId: row.productId,
          quantity,
          type,
          reason: reason.trim() || undefined,
        });
      }
      if (minimumStock !== row.minimumStock) {
        await setMin.mutateAsync({
          inventoryLocationId: row.inventoryLocationId,
          productId: row.productId,
          minimumStock,
        });
      }
      toast.success("Stock actualizado");
      onOpenChange(false);
    } catch (error) {
      toast.error("No se pudo ajustar el stock", extractErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {row.productName} · SKU {row.productSku} · {row.locationName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-4 gap-3 rounded-lg border border-border bg-surface/40 p-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Stock</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {row.stock}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Reservado</p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-muted-foreground">
                {row.reservedStock}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ajuste</p>
              <p
                className={`mt-1 text-lg font-semibold tabular-nums ${
                  quantity > 0
                    ? "text-success"
                    : quantity < 0
                      ? "text-destructive"
                      : "text-muted-foreground"
                }`}
              >
                {quantity > 0 ? "+" : ""}
                {quantity}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Resultante</p>
              <p
                className={`mt-1 text-lg font-semibold tabular-nums ${
                  isInvalid ? "text-destructive" : ""
                }`}
              >
                {nextStock}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              label="Cantidad (positiva o negativa)"
              htmlFor="quantity"
              description="Ej: 10 para agregar, -3 para descontar."
            >
              <Input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value) || 0)}
              />
            </FormField>
            <FormField label="Tipo de movimiento">
              <Select
                value={type}
                onValueChange={(v) => setType(v as AdjustType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALLOWED_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {MOVEMENT_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField
            label="Stock mínimo"
            htmlFor="minimumStock"
            description="Se mostrará alerta cuando el stock baje de este valor."
          >
            <Input
              id="minimumStock"
              type="number"
              min={0}
              value={minimumStock}
              onChange={(e) => setMinimumStock(Number(e.target.value) || 0)}
            />
          </FormField>

          <FormField label="Motivo" htmlFor="reason">
            <Textarea
              id="reason"
              rows={2}
              placeholder="Inventario inicial, conteo físico, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adjust.isPending || setMin.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            isLoading={adjust.isPending || setMin.isPending}
            disabled={isInvalid}
          >
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
