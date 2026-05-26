"use client";

import { CheckCircle2, Crown, Printer, ScrollText, Ticket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { DOCUMENT_TYPE_LABEL, RECEIPT_TYPE_LABEL } from "@/types/api";
import type { PosSale } from "../types";
import { PAYMENT_METHOD_LABEL } from "../types";

interface Props {
  sale: PosSale | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SaleSuccessDialog({ sale, open, onOpenChange }: Props) {
  if (!sale) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[95vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-emerald-600">
            <CheckCircle2 className="size-5" /> Venta registrada
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2 rounded-xl border border-[#11111111] bg-[#FAFAFA] p-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">N° interno</span>
            <span className="font-mono text-xs">{sale.number}</span>
          </div>
          {sale.receipt ? (
            <>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {RECEIPT_TYPE_LABEL[sale.receipt.type]}
                </span>
                <span className="font-mono text-xs font-semibold">
                  {sale.receipt.formatted}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Estado SUNAT</span>
                <span className="text-[10px] uppercase tracking-wider text-[#0A0A0A]/55">
                  {sale.receipt.sunatStatus}
                </span>
              </div>
            </>
          ) : null}
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Fecha</span>
            <span className="text-xs">{formatDate(sale.createdAt)}</span>
          </div>
          <div className="my-2 border-t border-border" />

          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal bruto</span>
            <span className="tabular-nums">{formatCurrency(sale.subtotal)}</span>
          </div>
          {sale.discount > 0 ? (
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Descuento</span>
              <span className="tabular-nums">
                - {formatCurrency(sale.discount)}
              </span>
            </div>
          ) : null}
          <div className="flex items-center justify-between text-xs text-[#0A0A0A]/55">
            <span>Base imponible</span>
            <span className="tabular-nums">
              {formatCurrency(sale.fiscal.subtotalUntaxed)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs text-[#0A0A0A]/55">
            <span>IGV {sale.fiscal.igvRate.toFixed(0)}%</span>
            <span className="tabular-nums">
              {formatCurrency(sale.fiscal.igvAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between text-base">
            <span className="font-medium">Total</span>
            <span className="text-xl font-semibold tabular-nums text-primary">
              {formatCurrency(sale.total)}
            </span>
          </div>
        </div>

        {sale.fiscalSnapshot.documentNumber ||
        sale.fiscalSnapshot.legalName ? (
          <div className="space-y-1 rounded-lg border border-[#11111111] bg-[#FAFAFA] p-3 text-xs">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-[#9810FA]">
              <ScrollText className="size-3" />
              Datos fiscales
            </div>
            {sale.fiscalSnapshot.legalName ? (
              <p className="font-medium text-[#0A0A0A]">
                {sale.fiscalSnapshot.legalName}
              </p>
            ) : null}
            {sale.fiscalSnapshot.documentNumber ? (
              <p className="text-[#0A0A0A]/65">
                {sale.fiscalSnapshot.documentType
                  ? DOCUMENT_TYPE_LABEL[sale.fiscalSnapshot.documentType]
                  : "Doc"}{" "}
                {sale.fiscalSnapshot.documentNumber}
              </p>
            ) : null}
            {sale.fiscalSnapshot.fiscalAddress ? (
              <p className="text-[#0A0A0A]/55">
                {sale.fiscalSnapshot.fiscalAddress}
              </p>
            ) : null}
            {sale.fiscalSnapshot.email ? (
              <p className="text-[#0A0A0A]/55">{sale.fiscalSnapshot.email}</p>
            ) : null}
          </div>
        ) : null}

        <div className="space-y-1 rounded-lg border border-[#11111114] bg-[#FAFAFA] p-2 text-xs">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Pagos
          </p>
          {sale.payments.map((p) => (
            <div key={p.id} className="flex justify-between">
              <span>
                {PAYMENT_METHOD_LABEL[p.method]}
                {p.reference ? (
                  <span className="text-muted-foreground"> · {p.reference}</span>
                ) : null}
              </span>
              <span className="tabular-nums">{formatCurrency(p.amount)}</span>
            </div>
          ))}
        </div>

        {sale.customer ? (
          <div className="rounded-lg border border-[#9810FA]/25 bg-[#9810FA]/6 p-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="font-medium">{sale.customer.fullName}</span>
              {sale.customer.isMember ? (
                <Crown className="size-3 text-primary" />
              ) : null}
            </div>
            {sale.raffleEntriesGenerated > 0 ? (
              <p className="mt-1 flex items-center gap-1 text-primary">
                <Ticket className="size-3" />
                {sale.raffleEntriesGenerated} participación(es) generada(s)
              </p>
            ) : null}
            {sale.membershipDiscountApplied ? (
              <p className="mt-0.5 text-muted-foreground">
                Descuento de miembro aplicado a productos con oferta.
              </p>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (typeof window !== "undefined") window.print();
            }}
          >
            <Printer className="size-4" /> Imprimir
          </Button>
          <Button onClick={() => onOpenChange(false)}>Nueva venta</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
