"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowLeftRight,
  History,
  Loader2,
  Receipt,
  Search,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";
import { usePosLocation } from "@/features/pos/hooks/use-pos";
import {
  useCreditNotesForLocation,
  useSearchOrderForReturn,
} from "../hooks/use-pos-returns";
import {
  CREDIT_NOTE_TYPE_LABEL,
  type CreditNote,
  type ReturnableOrder,
} from "../types";
import { CreditNoteDialog } from "./credit-note-dialog";

interface Props {
  slug: string;
}

export function ReturnsView({ slug }: Props) {
  const { data: location, isLoading: locLoading, isError } = usePosLocation(slug);
  const locationId = location?.id;
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [openNcFor, setOpenNcFor] = useState<ReturnableOrder | null>(null);

  const search = useSearchOrderForReturn(submitted, Boolean(submitted));
  const history = useCreditNotesForLocation(locationId);

  if (locLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !location) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/pos">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No tienes acceso a esta sucursal en el POS.
          </CardContent>
        </Card>
      </div>
    );
  }

  const order = search.data;

  return (
    <>
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
          Devoluciones · {location.name}
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">
          Notas de crédito y anulaciones
        </h1>
        <p className="text-sm text-muted-foreground">
          Busca una venta por número de boleta, número de orden o ID, y emite la
          nota correspondiente. El sistema revierte stock, caja, sorteos y
          membresía automáticamente.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="size-4 text-[#9810FA]" /> Buscar venta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmitted(query.trim());
            }}
          >
            <FormField
              label="Boleta, orden o ID"
              className="flex-1 min-w-[220px]"
              description="Ej: B001-00000123, PC-20260525-A1B2C3"
            >
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="B001-00000123"
                autoFocus
                autoComplete="off"
              />
            </FormField>
            <Button type="submit" disabled={query.trim().length < 3}>
              <Search className="size-4" /> Buscar
            </Button>
          </form>

          {submitted && search.isLoading ? (
            <div className="mt-4 flex items-center justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : null}

          {submitted && search.isError ? (
            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
              No se encontró ninguna venta POS con ese identificador en esta
              sucursal.
            </div>
          ) : null}

          {order ? (
            <OrderPanel
              order={order}
              onIssueNote={() => setOpenNcFor(order)}
            />
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4 text-[#9810FA]" /> Historial de notas de
            crédito
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (history.data ?? []).length === 0 ? (
            <EmptyState
              icon={ArrowLeftRight}
              title="Sin notas emitidas"
              description="Aún no se han registrado devoluciones en esta sucursal."
            />
          ) : (
            <CreditNoteHistoryTable notes={history.data ?? []} />
          )}
        </CardContent>
      </Card>

      {openNcFor ? (
        <CreditNoteDialog
          order={openNcFor}
          open={Boolean(openNcFor)}
          onOpenChange={(o) => {
            if (!o) setOpenNcFor(null);
          }}
          onCreated={() => {
            // Refrescar la búsqueda de la orden (puede que ahora esté fully returned)
            search.refetch();
            history.refetch();
          }}
        />
      ) : null}
    </>
  );
}

// ─── Detalle de la orden con items devolvibles ──────────────────────────────

function OrderPanel({
  order,
  onIssueNote,
}: {
  order: ReturnableOrder;
  onIssueNote: () => void;
}) {
  return (
    <div className="mt-4 space-y-4 rounded-xl border border-[#11111111] bg-[#FAFAFA] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm">
            <Receipt className="size-4 text-[#9810FA]" />
            <span className="font-semibold">{order.number}</span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {order.formattedReceipt ?? "Sin boleta"}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            Emitida {new Date(order.createdAt).toLocaleString("es-PE")}
            {order.customer ? (
              <>
                {" · "}
                <span className="text-foreground">
                  {order.customer.fullName}
                </span>
                {order.customer.dni ? ` (DNI ${order.customer.dni})` : ""}
                {order.customer.isMember ? (
                  <span className="ml-2 rounded-full bg-[#9810FA]/15 px-2 py-0.5 text-[10px] font-medium text-[#9810FA]">
                    Miembro
                  </span>
                ) : null}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onIssueNote}
            disabled={order.fullyReturned}
            title={
              order.fullyReturned
                ? "Esta venta ya fue devuelta completamente"
                : undefined
            }
          >
            <ArrowLeftRight className="size-4" /> Emitir nota de crédito
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Mini label="Total venta" value={formatCurrency(order.total)} />
        <Mini
          label="Ya devuelto"
          value={formatCurrency(order.refundedTotal)}
          tone={order.refundedTotal > 0 ? "warning" : "default"}
        />
        <Mini
          label="Pendiente"
          value={formatCurrency(order.total - order.refundedTotal)}
        />
        <Mini
          label="Caja"
          value={order.hasOpenSession ? "Abierta" : "Cerrada"}
          tone={order.hasOpenSession ? "success" : "warning"}
        />
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Items vendidos
        </p>
        <div className="overflow-hidden rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface/60 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Producto</th>
                <th className="px-3 py-2 text-right">Vendido</th>
                <th className="px-3 py-2 text-right">Devuelto</th>
                <th className="px-3 py-2 text-right">Disponible</th>
                <th className="px-3 py-2 text-right">P. Unit.</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {order.items.map((it) => (
                <tr key={it.orderItemId}>
                  <td className="px-3 py-2">{it.productName}</td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {it.quantitySold}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums">
                    {it.quantityReturned}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-2 text-right font-medium tabular-nums",
                      it.quantityAvailable > 0
                        ? "text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {it.quantityAvailable}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                    {formatCurrency(it.unitPrice)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {order.creditNotes.length > 0 ? (
        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Notas emitidas sobre esta venta
          </p>
          <CreditNoteHistoryTable notes={order.creditNotes} compact />
        </div>
      ) : null}
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "warning";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-white p-2.5",
        tone === "success"
          ? "border-emerald-200"
          : tone === "warning"
            ? "border-amber-200"
            : "border-[#11111111]",
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#0A0A0A]/45">
        {label}
      </p>
      <p className="text-sm font-semibold tabular-nums text-[#0A0A0A]">
        {value}
      </p>
    </div>
  );
}

// ─── Tabla de historial reutilizable ────────────────────────────────────────

export function CreditNoteHistoryTable({
  notes,
  compact = false,
}: {
  notes: CreditNote[];
  compact?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-surface/60 text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-3 py-2 text-left">Número</th>
            {!compact ? <th className="px-3 py-2 text-left">Venta</th> : null}
            <th className="px-3 py-2 text-left">Tipo</th>
            <th className="px-3 py-2 text-left">Motivo</th>
            <th className="px-3 py-2 text-right">Total</th>
            <th className="px-3 py-2 text-right">Efectivo</th>
            <th className="px-3 py-2 text-left">Cajero</th>
            <th className="px-3 py-2 text-left">Fecha</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {notes.map((n) => (
            <tr key={n.id}>
              <td className="px-3 py-2">
                <div className="font-medium tabular-nums">{n.number}</div>
                {n.formattedReceipt ? (
                  <div className="text-[10px] font-mono text-[#9810FA]">
                    {n.formattedReceipt}
                  </div>
                ) : null}
              </td>
              {!compact ? (
                <td className="px-3 py-2 text-muted-foreground">
                  {n.order.number}
                  {n.order.formattedReceipt ? (
                    <span className="ml-1 text-[10px]">
                      ({n.order.formattedReceipt})
                    </span>
                  ) : null}
                </td>
              ) : null}
              <td className="px-3 py-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-medium",
                    n.type === "FULL_RETURN" || n.type === "SALE_CANCELLATION"
                      ? "bg-rose-50 text-rose-700"
                      : n.type === "PARTIAL_RETURN"
                        ? "bg-amber-50 text-amber-700"
                        : "bg-[#9810FA]/8 text-[#9810FA]",
                  )}
                >
                  {CREDIT_NOTE_TYPE_LABEL[n.type]}
                </span>
              </td>
              <td className="px-3 py-2 max-w-[260px] truncate text-muted-foreground">
                {n.reason}
              </td>
              <td className="px-3 py-2 text-right tabular-nums">
                {formatCurrency(n.total)}
              </td>
              <td className="px-3 py-2 text-right tabular-nums text-muted-foreground">
                {formatCurrency(n.refundedCash)}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {n.createdBy.firstName} {n.createdBy.lastName}
              </td>
              <td className="px-3 py-2 text-xs text-muted-foreground">
                {new Date(n.createdAt).toLocaleString("es-PE")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
