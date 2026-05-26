"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Lock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { PageHeader } from "@/shared/ui/page-header";
import { Badge } from "@/shared/ui/badge";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import {
  usePosActiveSession,
  usePosLocation,
  usePosSessions,
} from "../hooks/use-pos";
import type {
  CashSession,
  CashSessionMovement,
  ManualMovementType,
} from "../types";
import { MOVEMENT_TYPE_LABEL, PAYMENT_METHOD_LABEL } from "../types";
import { CashMovementDialog } from "./cash-movement-dialog";
import { CloseSessionDialog } from "./close-session-dialog";
import { OpenSessionDialog } from "./open-session-dialog";

interface Props {
  slug: string;
}

export function CashSessionView({ slug }: Props) {
  const { data: location, isLoading: locLoading } = usePosLocation(slug);
  const { data: session } = usePosActiveSession(location?.id);
  const { data: history = [] } = usePosSessions(location?.id);

  const [openOpen, setOpenOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveType, setMoveType] = useState<ManualMovementType>("INCOME");

  if (locLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!location) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/pos">
            <ArrowLeft className="size-4" /> Volver
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Sucursal no encontrada.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href={`/pos/${slug}`}>
          <ArrowLeft className="size-4" /> Volver al POS
        </Link>
      </Button>

      <PageHeader
        title={`Caja · ${location.name}`}
        description="Sesión activa, movimientos auditados y sesiones recientes."
        actions={
          session ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setMoveType("INCOME");
                  setMoveOpen(true);
                }}
              >
                <TrendingUp className="size-4" /> Ingreso
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setMoveType("EXPENSE");
                  setMoveOpen(true);
                }}
              >
                <TrendingDown className="size-4" /> Egreso
              </Button>
              <Button variant="destructive" onClick={() => setCloseOpen(true)}>
                <Lock className="size-4" /> Cerrar caja
              </Button>
            </>
          ) : (
            <Button onClick={() => setOpenOpen(true)}>Abrir caja</Button>
          )
        }
      />

      {session ? (
        <ActiveSessionPanel session={session} />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No hay sesión de caja abierta. Abre una para empezar a operar.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Sesiones recientes</CardTitle>
          <CardDescription>
            Últimos turnos de caja con diferencias y montos cerrados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <HistoryTable rows={history} />
        </CardContent>
      </Card>

      <OpenSessionDialog
        locationId={location.id}
        open={openOpen}
        onOpenChange={setOpenOpen}
      />
      {session ? (
        <>
          <CloseSessionDialog
            session={session}
            open={closeOpen}
            onOpenChange={setCloseOpen}
          />
          <CashMovementDialog
            sessionId={session.id}
            initialType={moveType}
            open={moveOpen}
            onOpenChange={setMoveOpen}
          />
        </>
      ) : null}
    </>
  );
}

function ActiveSessionPanel({ session }: { session: CashSession }) {
  const movementColumns: DataTableColumn<CashSessionMovement>[] = [
    {
      key: "time",
      header: "Hora",
      cell: (row) => (
        <span className="text-xs">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      key: "type",
      header: "Tipo",
      cell: (row) => (
        <Badge
          variant={
            row.type === "SALE"
              ? "default"
              : row.type === "INCOME"
                ? "success"
                : row.type === "EXPENSE"
                  ? "warning"
                  : "outline"
          }
        >
          {MOVEMENT_TYPE_LABEL[row.type]}
        </Badge>
      ),
    },
    {
      key: "amount",
      header: "Monto",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <span
          className={
            row.type === "EXPENSE" ? "text-destructive" : "text-foreground"
          }
        >
          {row.type === "EXPENSE" ? "- " : ""}
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      key: "reason",
      header: "Motivo",
      cell: (row) => (
        <div className="min-w-0">
          <p className="line-clamp-1 text-xs">{row.reason ?? "—"}</p>
          {row.orderNumber ? (
            <p className="text-[10px] text-muted-foreground">
              Orden {row.orderNumber}
            </p>
          ) : null}
        </div>
      ),
    },
    {
      key: "by",
      header: "Cajero",
      cell: (row) =>
        row.createdBy ? (
          <span className="text-xs">
            {row.createdBy.firstName} {row.createdBy.lastName}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
  ];

  return (
    <div className="grid gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Totales del turno</CardTitle>
          <CardDescription>Calculados en tiempo real.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <Row
            label="Apertura"
            value={formatCurrency(session.openingAmount)}
          />
          <Row
            label="Ventas"
            value={formatCurrency(session.totals.salesTotal)}
            hint={`${session.totals.salesCount} órdenes`}
          />
          <Row
            label="Ingresos manuales"
            value={formatCurrency(session.totals.incomeTotal)}
          />
          <Row
            label="Egresos manuales"
            value={`- ${formatCurrency(session.totals.expenseTotal)}`}
          />
          <div className="my-2 border-t border-border" />
          <Row
            label="Efectivo esperado"
            value={formatCurrency(session.totals.expectedCash)}
            highlight
          />

          {session.totals.byPaymentMethod.length > 0 ? (
            <>
              <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">
                Cobros por método
              </p>
              <div className="space-y-1 rounded-lg border border-[#11111111] bg-[#FAFAFA] p-2.5 text-xs">
                {session.totals.byPaymentMethod.map((p) => (
                  <div key={p.method} className="flex justify-between">
                    <span>
                      {PAYMENT_METHOD_LABEL[p.method]} · {p.count}
                    </span>
                    <span className="font-medium tabular-nums">
                      {formatCurrency(p.total)}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader>
          <CardTitle>Movimientos</CardTitle>
          <CardDescription>
            Todos los eventos de la sesión (apertura, ventas, ingresos, egresos).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable<CashSessionMovement>
            data={session.movements}
            columns={movementColumns}
            rowKey={(row) => row.id}
            emptyTitle="Sin movimientos todavía"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function HistoryTable({ rows }: { rows: CashSession[] }) {
  const columns: DataTableColumn<CashSession>[] = [
    {
      key: "openedAt",
      header: "Apertura",
      cell: (row) => (
        <span className="text-xs">{formatDate(row.openedAt)}</span>
      ),
    },
    {
      key: "closedAt",
      header: "Cierre",
      cell: (row) =>
        row.closedAt ? (
          <span className="text-xs">{formatDate(row.closedAt)}</span>
        ) : (
          <Badge variant="success">Abierta</Badge>
        ),
    },
    {
      key: "openedBy",
      header: "Cajero",
      cell: (row) => (
        <span className="text-xs">
          {row.openedBy.firstName} {row.openedBy.lastName}
        </span>
      ),
    },
    {
      key: "sales",
      header: "Ventas",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => formatCurrency(row.totals.salesTotal),
    },
    {
      key: "diff",
      header: "Diferencia",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => {
        if (row.differenceAmount === null || row.differenceAmount === undefined)
          return <span className="text-xs text-muted-foreground">—</span>;
        const positive = row.differenceAmount >= 0;
        return (
          <span
            className={positive ? "text-emerald-600" : "text-destructive"}
          >
            {positive ? "+" : ""}
            {formatCurrency(row.differenceAmount)}
          </span>
        );
      },
    },
  ];
  return (
    <DataTable<CashSession>
      data={rows}
      columns={columns}
      rowKey={(row) => row.id}
      emptyTitle="Sin sesiones previas"
    />
  );
}

function Row({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "flex items-center justify-between rounded-md border border-primary/30 bg-primary/10 px-3 py-2"
          : "flex items-center justify-between"
      }
    >
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
      </div>
      <span
        className={
          highlight
            ? "text-lg font-semibold tabular-nums"
            : "text-sm font-medium tabular-nums"
        }
      >
        {value}
      </span>
    </div>
  );
}
