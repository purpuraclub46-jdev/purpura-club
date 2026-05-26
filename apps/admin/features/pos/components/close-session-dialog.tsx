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
import { formatCurrency } from "@/shared/lib/format";
import { toast } from "@/stores/toast.store";
import { useCloseSession } from "../hooks/use-pos";
import type { CashSession } from "../types";
import { PAYMENT_METHOD_LABEL } from "../types";

interface Props {
  session: CashSession;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CloseSessionDialog({ session, open, onOpenChange }: Props) {
  const mutation = useCloseSession(session.id);
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setAmount("");
      setNotes("");
      setError(null);
    }
  }, [open]);

  const numericAmount = Number(amount);
  const expectedCash = session.totals.expectedCash;
  const diff =
    Number.isNaN(numericAmount) || amount === ""
      ? null
      : numericAmount - expectedCash;

  const handleSubmit = async () => {
    if (Number.isNaN(numericAmount) || numericAmount < 0) {
      setError("Ingresa un monto válido (S/)");
      return;
    }
    try {
      await mutation.mutateAsync({
        closingAmount: numericAmount,
        notes: notes.trim() || undefined,
      });
      toast.success("Caja cerrada");
      onOpenChange(false);
    } catch (e) {
      toast.error("No se pudo cerrar la caja", extractErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Cerrar caja</DialogTitle>
          <DialogDescription>
            Revisa los totales del turno y declara el efectivo real que tienes
            en la caja. Se registrará un movimiento de cierre.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <Stat label="Apertura" value={formatCurrency(session.openingAmount)} />
          <Stat
            label="Ventas totales"
            value={formatCurrency(session.totals.salesTotal)}
          />
          <Stat
            label="Ingresos manuales"
            value={formatCurrency(session.totals.incomeTotal)}
          />
          <Stat
            label="Egresos manuales"
            value={`- ${formatCurrency(session.totals.expenseTotal)}`}
          />
          <div className="col-span-2 rounded-xl border border-[#9810FA]/25 bg-[#9810FA]/6 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9810FA]">
              Efectivo esperado
            </p>
            <p className="mt-0.5 text-2xl font-semibold tabular-nums text-[#0A0A0A]">
              {formatCurrency(expectedCash)}
            </p>
          </div>
        </div>

        {session.totals.byPaymentMethod.length > 0 ? (
          <div className="space-y-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0A0A0A]/45">
              Cobros por método
            </p>
            <div className="space-y-1 rounded-lg border border-[#11111111] bg-[#FAFAFA] p-2.5 text-xs">
              {session.totals.byPaymentMethod.map((p) => (
                <div key={p.method} className="flex justify-between">
                  <span className="text-[#0A0A0A]/70">
                    {PAYMENT_METHOD_LABEL[p.method]} · {p.count}
                  </span>
                  <span className="font-medium tabular-nums text-[#0A0A0A]">
                    {formatCurrency(p.total)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <FormField
          label="Efectivo real contado (S/)"
          required
          error={error ?? undefined}
          description={
            diff !== null
              ? diff === 0
                ? "✓ La caja cuadra exactamente."
                : diff > 0
                  ? `Sobrante: ${formatCurrency(diff)}`
                  : `Faltante: ${formatCurrency(Math.abs(diff))}`
              : undefined
          }
        >
          <Input
            type="number"
            inputMode="decimal"
            step="0.01"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={expectedCash.toFixed(2)}
            autoFocus
          />
        </FormField>

        <FormField label="Notas del cierre (opcional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Justificación de diferencia, observaciones del turno…"
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
            Cerrar caja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-[#11111111] bg-[#FAFAFA] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0A0A0A]/45">
        {label}
      </p>
      <p className="mt-0.5 text-base font-semibold tabular-nums text-[#0A0A0A]">
        {value}
      </p>
    </div>
  );
}
