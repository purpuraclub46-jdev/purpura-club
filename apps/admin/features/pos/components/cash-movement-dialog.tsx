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
import { useAddMovement } from "../hooks/use-pos";
import type { ManualMovementType } from "../types";

const REASONS: Record<ManualMovementType, string[]> = {
  INCOME: ["Cambio inicial", "Ingreso manual", "Ajuste caja"],
  EXPENSE: ["Movilidad", "Limpieza", "Gasto tienda", "Retiro gerente", "Caja chica"],
};

interface Props {
  sessionId: string;
  initialType: ManualMovementType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CashMovementDialog({
  sessionId,
  initialType,
  open,
  onOpenChange,
}: Props) {
  const mutation = useAddMovement(sessionId);
  const [type, setType] = useState<ManualMovementType>(initialType);
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setType(initialType);
      setAmount("");
      setReason("");
      setNotes("");
      setErrors({});
    }
  }, [open, initialType]);

  const handleSubmit = async () => {
    const next: Record<string, string> = {};
    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
      next.amount = "Monto inválido";
    }
    if (!reason.trim()) next.reason = "Indica un motivo";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    try {
      await mutation.mutateAsync({
        type,
        amount: numericAmount,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success(
        type === "INCOME" ? "Ingreso registrado" : "Egreso registrado",
      );
      onOpenChange(false);
    } catch (e) {
      toast.error("No se pudo registrar el movimiento", extractErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {type === "INCOME" ? "Registrar ingreso" : "Registrar egreso"}
          </DialogTitle>
          <DialogDescription>
            Queda auditado en el movimiento de caja del turno actual.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={type === "INCOME" ? "default" : "outline"}
            onClick={() => setType("INCOME")}
            disabled={mutation.isPending}
          >
            Ingreso
          </Button>
          <Button
            variant={type === "EXPENSE" ? "default" : "outline"}
            onClick={() => setType("EXPENSE")}
            disabled={mutation.isPending}
          >
            Egreso
          </Button>
        </div>

        <FormField label="Monto (S/)" required error={errors.amount}>
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="20.00"
            autoFocus
          />
        </FormField>

        <FormField label="Motivo" required error={errors.reason}>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Movilidad, ajuste, cambio…"
            list="reason-suggestions"
          />
          <datalist id="reason-suggestions">
            {REASONS[type].map((r) => (
              <option key={r} value={r} />
            ))}
          </datalist>
        </FormField>

        <FormField label="Notas (opcional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalle adicional, justificación, autorizado por…"
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
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
