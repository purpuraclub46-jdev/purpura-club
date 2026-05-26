"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { useOpenSession } from "../hooks/use-pos";

interface Props {
  locationId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function OpenSessionDialog({ locationId, open, onOpenChange }: Props) {
  const mutation = useOpenSession(locationId);
  const [amount, setAmount] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    const value = Number(amount);
    if (Number.isNaN(value) || value < 0) {
      setError("Ingresa un monto válido (S/)");
      return;
    }
    try {
      await mutation.mutateAsync({
        openingAmount: value,
        notes: notes.trim() || undefined,
      });
      toast.success("Caja abierta");
      onOpenChange(false);
    } catch (e) {
      toast.error("No se pudo abrir la caja", extractErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Abrir caja</DialogTitle>
          <DialogDescription>
            Declara el monto inicial en efectivo. Quedará registrado como
            apertura.
          </DialogDescription>
        </DialogHeader>

        <FormField label="Monto inicial (S/)" required error={error ?? undefined}>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100.00"
            autoFocus
          />
        </FormField>

        <FormField label="Notas (opcional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Cambio para fondo, observación del turno…"
            rows={2}
          />
        </FormField>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={mutation.isPending}
          >
            Abrir caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
