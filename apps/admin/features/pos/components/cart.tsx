"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { formatCurrency } from "@/shared/lib/format";

export interface CartLine {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  /** Indica si el unitPrice ya tiene aplicado el precio de miembro. */
  isMemberPrice: boolean;
  /** Stock disponible para validar el +. */
  stock: number;
}

interface Props {
  lines: CartLine[];
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  subtotal: number;
  discount: number;
  total: number;
  /** Base imponible (total SIN IGV). */
  subtotalUntaxed: number;
  /** IGV contenido en el total. */
  igvAmount: number;
  /** Tasa IGV % aplicada (típicamente 18). */
  igvRate: number;
  onDiscountChange: (value: number) => void;
  disabled?: boolean;
}

export function Cart({
  lines,
  onQuantityChange,
  onRemove,
  subtotal,
  discount,
  total,
  subtotalUntaxed,
  igvAmount,
  igvRate,
  onDiscountChange,
  disabled,
}: Props) {
  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-[#0A0A0A]">Carrito</p>
        <span className="text-xs text-[#0A0A0A]/55">
          {lines.length} producto{lines.length === 1 ? "" : "s"}
        </span>
      </div>

      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {lines.length === 0 ? (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-[#11111118] bg-[#FAFAFA] p-8 text-center text-xs text-[#0A0A0A]/50">
            Carrito vacío. Selecciona productos del panel izquierdo.
          </div>
        ) : (
          lines.map((line) => (
            <div
              key={line.productId}
              className="rounded-lg border border-[#11111111] bg-white p-2.5 transition-colors hover:border-[#11111122]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-sm font-medium text-[#0A0A0A]">
                    {line.productName}
                  </p>
                  <p className="text-[10px] text-[#0A0A0A]/55">
                    SKU {line.sku} · {formatCurrency(line.unitPrice)} c/u
                    {line.isMemberPrice ? (
                      <span className="ml-1 font-semibold text-[#9810FA]">
                        · Miembro
                      </span>
                    ) : null}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemove(line.productId)}
                  aria-label="Quitar"
                  disabled={disabled}
                  className="size-7"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={disabled || line.quantity <= 1}
                    onClick={() =>
                      onQuantityChange(line.productId, line.quantity - 1)
                    }
                  >
                    <Minus className="size-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-medium tabular-nums">
                    {line.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={disabled || line.quantity >= line.stock}
                    onClick={() =>
                      onQuantityChange(line.productId, line.quantity + 1)
                    }
                  >
                    <Plus className="size-3" />
                  </Button>
                </div>
                <span className="text-sm font-semibold tabular-nums">
                  {formatCurrency(line.unitPrice * line.quantity)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="lux-card space-y-2.5 rounded-xl p-3.5">
        <Row label="Subtotal bruto" value={formatCurrency(subtotal)} />
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-[#0A0A0A]/60">Descuento manual</span>
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={discount || ""}
            onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
            placeholder="0.00"
            disabled={disabled}
            className="h-8 w-28 text-right tabular-nums"
          />
        </div>
        <div className="border-t border-[#11111111] pt-2">
          <Row
            label="Base imponible"
            value={formatCurrency(subtotalUntaxed)}
            muted
          />
          <Row
            label={`IGV ${igvRate.toFixed(0)}%`}
            value={formatCurrency(igvAmount)}
            muted
          />
        </div>
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2.5",
            "border border-[#9810FA]/25 bg-[#9810FA]/8",
          )}
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9810FA]">
            Total · incluye IGV
          </span>
          <span className="text-2xl font-semibold tabular-nums text-[#0A0A0A]">
            {formatCurrency(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={muted ? "text-[#0A0A0A]/45" : "text-[#0A0A0A]/60"}>
        {label}
      </span>
      <span
        className={cn(
          "font-medium tabular-nums",
          muted ? "text-[#0A0A0A]/70" : "text-[#0A0A0A]",
        )}
      >
        {value}
      </span>
    </div>
  );
}
