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
import { useBranchesList } from "@/features/branches/hooks/use-branches";
import { useProductsList } from "@/features/products/hooks/use-products";
import { useTransferStock } from "../hooks/use-inventory";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TransferStockDialog({ open, onOpenChange }: Props) {
  const transfer = useTransferStock();
  const { data: branchesData } = useBranchesList({
    page: 1,
    limit: 100,
    active: true,
  });
  const { data: productsData } = useProductsList({
    page: 1,
    limit: 100,
    active: true,
  });

  const [productId, setProductId] = useState("");
  const [fromBranchId, setFromBranchId] = useState("");
  const [toBranchId, setToBranchId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setProductId("");
      setFromBranchId("");
      setToBranchId("");
      setQuantity(1);
      setReason("");
    }
  }, [open]);

  const branches = branchesData?.items ?? [];
  const products = productsData?.items ?? [];

  const handleSubmit = async () => {
    if (!productId || !fromBranchId || !toBranchId) {
      toast.error("Selecciona producto y ambas sucursales");
      return;
    }
    if (fromBranchId === toBranchId) {
      toast.error("Las sucursales origen y destino deben ser distintas");
      return;
    }
    if (quantity <= 0) {
      toast.error("La cantidad debe ser mayor a 0");
      return;
    }
    try {
      await transfer.mutateAsync({
        productId,
        fromBranchId,
        toBranchId,
        quantity,
        reason: reason.trim() || undefined,
      });
      toast.success("Transferencia registrada");
      onOpenChange(false);
    } catch (error) {
      toast.error("No se pudo transferir", extractErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transferir stock</DialogTitle>
          <DialogDescription>
            Mueve unidades de una sucursal a otra. Se registran dos movimientos:
            salida en origen, entrada en destino.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField label="Producto">
            <Select value={productId} onValueChange={setProductId}>
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
          </FormField>

          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Sucursal origen">
              <Select value={fromBranchId} onValueChange={setFromBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Origen" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
            <FormField label="Sucursal destino">
              <Select value={toBranchId} onValueChange={setToBranchId}>
                <SelectTrigger>
                  <SelectValue placeholder="Destino" />
                </SelectTrigger>
                <SelectContent>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FormField>
          </div>

          <FormField label="Cantidad" htmlFor="quantity">
            <Input
              id="quantity"
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 0)}
            />
          </FormField>

          <FormField label="Motivo" htmlFor="reason">
            <Textarea
              id="reason"
              rows={2}
              placeholder="Reposición de tienda, evento, etc."
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
            disabled={transfer.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            isLoading={transfer.isPending}
          >
            Transferir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
