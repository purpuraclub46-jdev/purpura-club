"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Package,
  Receipt as ReceiptIcon,
  Wallet,
} from "lucide-react";
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
import { Card, CardContent } from "@/shared/ui/card";
import { cn } from "@/shared/lib/cn";
import { extractErrorMessage } from "@/services/http/client";
import { formatCurrency } from "@/shared/lib/format";
import { toast } from "@/stores/toast.store";
import type { POSCreditNoteType } from "@/types/api";
import { useCreateCreditNote } from "../hooks/use-pos-returns";
import {
  CREDIT_NOTE_TYPE_DESCRIPTION,
  CREDIT_NOTE_TYPE_LABEL,
  type CreateCreditNotePayload,
  type CreditNote,
  type ReturnableOrder,
} from "../types";

interface Props {
  order: ReturnableOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (note: CreditNote) => void;
}

const TYPES: POSCreditNoteType[] = [
  "FULL_RETURN",
  "PARTIAL_RETURN",
  "PRODUCT_EXCHANGE",
  "SALE_CANCELLATION",
];

const round2 = (v: number): number => Math.round(v * 100) / 100;

export function CreditNoteDialog({
  order,
  open,
  onOpenChange,
  onCreated,
}: Props) {
  const mutation = useCreateCreditNote();
  const [type, setType] = useState<POSCreditNoteType>("FULL_RETURN");
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [refundedCash, setRefundedCash] = useState<string>("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset al abrir
  useEffect(() => {
    if (!open) return;
    setType("FULL_RETURN");
    setQuantities(
      Object.fromEntries(
        order.items.map((it) => [it.orderItemId, it.quantityAvailable]),
      ),
    );
    setReason("");
    setNotes("");
    setRefundedCash("");
    setErrors({});
  }, [open, order]);

  // Cuando cambia el tipo, ajusta cantidades por defecto
  useEffect(() => {
    if (type === "FULL_RETURN" || type === "SALE_CANCELLATION") {
      setQuantities(
        Object.fromEntries(
          order.items.map((it) => [it.orderItemId, it.quantityAvailable]),
        ),
      );
    } else {
      // En parcial / exchange empezamos en 0 y el cajero decide
      setQuantities(
        Object.fromEntries(order.items.map((it) => [it.orderItemId, 0])),
      );
    }
  }, [type, order]);

  const computedTotal = useMemo(() => {
    return round2(
      order.items.reduce((acc, it) => {
        const q = quantities[it.orderItemId] ?? 0;
        return acc + q * it.unitPrice;
      }, 0),
    );
  }, [order, quantities]);

  const isPartialMode = type === "PARTIAL_RETURN" || type === "PRODUCT_EXCHANGE";
  const requiresOpenSession = computedTotal > 0;
  const cantOperateNoSession = requiresOpenSession && !order.hasOpenSession;

  const setQty = (orderItemId: string, value: number, max: number) => {
    const v = Math.max(0, Math.min(max, Math.floor(value)));
    setQuantities((prev) => ({ ...prev, [orderItemId]: v }));
  };

  const handleSubmit = async () => {
    const next: Record<string, string> = {};
    if (!reason.trim() || reason.trim().length < 4) {
      next.reason = "Motivo requerido (mínimo 4 caracteres)";
    }
    if (isPartialMode) {
      const some = Object.values(quantities).some((q) => q > 0);
      if (!some) next.items = "Selecciona al menos un item para devolver";
    }
    if (computedTotal <= 0 && type !== "SALE_CANCELLATION") {
      next.items = "El total devuelto debe ser mayor a 0";
    }
    const cashNum = refundedCash === "" ? computedTotal : Number(refundedCash);
    if (refundedCash !== "" && (Number.isNaN(cashNum) || cashNum < 0)) {
      next.cash = "Efectivo inválido";
    }
    if (cashNum - computedTotal > 0.005) {
      next.cash = `No puedes devolver más de S/${computedTotal.toFixed(2)}`;
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const payload: CreateCreditNotePayload = {
      orderId: order.id,
      type,
      reason: reason.trim(),
      notes: notes.trim() || undefined,
      refundedCash: refundedCash === "" ? undefined : Number(refundedCash),
      items: isPartialMode
        ? order.items
            .filter((it) => (quantities[it.orderItemId] ?? 0) > 0)
            .map((it) => ({
              orderItemId: it.orderItemId,
              quantity: quantities[it.orderItemId],
            }))
        : undefined,
    };

    try {
      const note = await mutation.mutateAsync(payload);
      toast.success(
        `Nota de crédito ${note.number}`,
        `${CREDIT_NOTE_TYPE_LABEL[type]} por ${formatCurrency(note.total)}`,
      );
      onCreated?.(note);
      onOpenChange(false);
    } catch (e) {
      toast.error(
        "No se pudo emitir la nota de crédito",
        extractErrorMessage(e),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Emitir nota de crédito</DialogTitle>
          <DialogDescription>
            Venta {order.number} · {order.formattedReceipt ?? "sin boleta"} ·{" "}
            {formatCurrency(order.total)}
            {order.customer ? (
              <>
                {" · "}
                <span className="text-foreground">
                  {order.customer.fullName}
                </span>
                {order.customer.dni ? ` (DNI ${order.customer.dni})` : ""}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {/* Tipos */}
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {TYPES.map((t) => {
            const active = t === type;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "rounded-lg border px-3 py-2 text-left text-xs transition-colors",
                  active
                    ? "border-[#9810FA]/45 bg-[#9810FA]/8 text-[#0A0A0A]"
                    : "border-[#11111111] bg-white text-[#0A0A0A]/60 hover:border-[#11111122] hover:bg-[#FAFAFA] hover:text-[#0A0A0A]",
                )}
              >
                <p className="font-semibold">{CREDIT_NOTE_TYPE_LABEL[t]}</p>
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          {CREDIT_NOTE_TYPE_DESCRIPTION[type]}
        </p>

        {/* Items */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Package className="size-3.5" /> Productos a devolver
          </div>
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {order.items.length === 0 ? (
                <p className="p-4 text-center text-sm text-muted-foreground">
                  La venta no tiene items.
                </p>
              ) : (
                order.items.map((it) => {
                  const qty = quantities[it.orderItemId] ?? 0;
                  const editable = isPartialMode && it.quantityAvailable > 0;
                  const isFullSelected =
                    qty === it.quantityAvailable && qty > 0;
                  return (
                    <div
                      key={it.orderItemId}
                      className={cn(
                        "flex flex-wrap items-center gap-3 p-3",
                        it.quantityAvailable === 0 && "opacity-50",
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="truncate text-sm font-medium">
                          {it.productName}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          Vendidos: {it.quantitySold} · Ya devueltos:{" "}
                          {it.quantityReturned} · Disponibles para devolver:{" "}
                          <span className="text-foreground">
                            {it.quantityAvailable}
                          </span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatCurrency(it.unitPrice)} c/u
                        </span>
                        {editable ? (
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() =>
                                setQty(
                                  it.orderItemId,
                                  qty - 1,
                                  it.quantityAvailable,
                                )
                              }
                              disabled={qty <= 0}
                            >
                              -
                            </Button>
                            <Input
                              type="number"
                              min={0}
                              max={it.quantityAvailable}
                              value={qty}
                              onChange={(e) =>
                                setQty(
                                  it.orderItemId,
                                  Number(e.target.value),
                                  it.quantityAvailable,
                                )
                              }
                              className="h-8 w-16 text-center tabular-nums"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              type="button"
                              onClick={() =>
                                setQty(
                                  it.orderItemId,
                                  qty + 1,
                                  it.quantityAvailable,
                                )
                              }
                              disabled={qty >= it.quantityAvailable}
                            >
                              +
                            </Button>
                          </div>
                        ) : (
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-medium",
                              isFullSelected
                                ? "bg-[#9810FA]/15 text-[#9810FA]"
                                : "bg-muted/30 text-muted-foreground",
                            )}
                          >
                            {qty} ud
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
          {errors.items ? (
            <p className="text-xs text-destructive">{errors.items}</p>
          ) : null}
        </div>

        {/* Motivo + notas + efectivo */}
        <div className="grid gap-3 md:grid-cols-2">
          <FormField label="Motivo" required error={errors.reason}>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Producto defectuoso, cliente arrepentido…"
              maxLength={240}
            />
          </FormField>
          <FormField
            label="Efectivo a devolver (S/)"
            error={errors.cash}
            description={`Default: total de la nota (${formatCurrency(computedTotal)})`}
          >
            <Input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={refundedCash}
              onChange={(e) => setRefundedCash(e.target.value)}
              placeholder={computedTotal.toFixed(2)}
              disabled={!requiresOpenSession}
            />
          </FormField>
        </div>

        <FormField label="Notas (opcional)">
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalle adicional, autorizado por, observaciones..."
            rows={2}
            maxLength={1000}
          />
        </FormField>

        {/* Resumen + Warnings */}
        <div className="space-y-2 rounded-xl border border-[#11111111] bg-[#FAFAFA] p-3 text-sm">
          {(() => {
            const IGV_RATE = 18;
            const untaxed =
              Math.round((computedTotal / (1 + IGV_RATE / 100)) * 100) / 100;
            const igv = Math.round((computedTotal - untaxed) * 100) / 100;
            return (
              <>
                <div className="flex items-center justify-between text-xs text-[#0A0A0A]/55">
                  <span>Base imponible</span>
                  <span className="tabular-nums">{formatCurrency(untaxed)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-[#0A0A0A]/55">
                  <span>IGV {IGV_RATE}%</span>
                  <span className="tabular-nums">{formatCurrency(igv)}</span>
                </div>
              </>
            );
          })()}
          <div className="flex items-center justify-between border-t border-[#11111111] pt-2">
            <span className="text-[#0A0A0A]/60">Total a devolver</span>
            <span className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
              {formatCurrency(computedTotal)}
            </span>
          </div>
          {order.customer ? (
            <div className="flex items-center gap-2 text-xs text-[#0A0A0A]/55">
              <Wallet className="size-3.5" />
              Si esta era la única compra calificada del cliente,{" "}
              <strong className="text-[#0A0A0A]">
                se revertirá la membresía
              </strong>{" "}
              automáticamente.
            </div>
          ) : null}
          {(type === "FULL_RETURN" || type === "SALE_CANCELLATION") &&
          order.customer ? (
            <div className="flex items-center gap-2 text-xs text-[#0A0A0A]/55">
              <ReceiptIcon className="size-3.5" />
              Se cancelarán los tickets de sorteo asociados a esta venta.
            </div>
          ) : null}
          {cantOperateNoSession ? (
            <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              <AlertTriangle className="size-3.5" />
              No hay caja abierta en esta sucursal — abre la caja para devolver
              efectivo.
            </div>
          ) : (
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="size-3.5" />
              Stock e inventario se restituyen automáticamente.
            </div>
          )}
        </div>

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
            disabled={cantOperateNoSession || order.fullyReturned}
          >
            {mutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : null}
            Emitir nota de crédito
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
