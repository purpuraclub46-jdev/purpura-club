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
import type { InventoryMovementType } from "@/types/api";
import { useAdjustStock } from "../hooks/use-inventory";
import { MOVEMENT_TYPE_LABEL, type InventoryRow } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: InventoryRow | null;
}

const ALLOWED_TYPES: InventoryMovementType[] = [
  "RESTOCK",
  "ADJUSTMENT",
  "LOSS",
];

export function AdjustStockDialog({ open, onOpenChange, row }: Props) {
  const adjust = useAdjustStock();
  const [quantity, setQuantity] = useState(0);
  const [type, setType] = useState<InventoryMovementType>("RESTOCK");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setQuantity(0);
      setType("RESTOCK");
      setReason("");
    }
  }, [open]);

  if (!row) return null;

  const handleSubmit = async () => {
    if (quantity === 0) {
      toast.error("La cantidad no puede ser 0");
      return;
    }
    try {
      await adjust.mutateAsync({
        branchId: row.branchId,
        productId: row.productId,
        quantity,
        type,
        reason: reason.trim() || undefined,
      });
      toast.success("Stock actualizado");
      onOpenChange(false);
    } catch (error) {
      toast.error("No se pudo ajustar el stock", extractErrorMessage(error));
    }
  };

  const nextStock = row.stock + quantity;
  const isInvalid = nextStock < 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar stock</DialogTitle>
          <DialogDescription>
            {row.productName} · SKU {row.productSku} · {row.branchName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 rounded-lg border border-border bg-surface/40 p-4 text-center">
            <div>
              <p className="text-xs text-muted-foreground">Stock actual</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">
                {row.stock}
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
                onValueChange={(v) => setType(v as InventoryMovementType)}
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
            disabled={adjust.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            isLoading={adjust.isPending}
            disabled={isInvalid || quantity === 0}
          >
            Aplicar ajuste
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
