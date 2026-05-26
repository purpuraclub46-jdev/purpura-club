"use client";

import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpRight,
  Loader2,
  Lock,
  ScanLine,
  Store,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { PageHeader } from "@/shared/ui/page-header";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";
import {
  usePosBootstrap,
  usePosReports,
} from "@/features/pos/hooks/use-pos";
import type { PosLocation } from "@/features/pos/types";

/**
 * Monitoreo POS — vista global de SUPER_ADMIN / ADMIN con permiso
 * `reports.view`. Muestra cada sucursal con sus KPIs en tiempo real y
 * enlace directo al POS standalone.
 */
export default function PosMonitoringPage() {
  const { data, isLoading, isError } = usePosBootstrap();
  const locations = data?.availableLocations ?? [];

  return (
    <>
      <PageHeader
        title="Monitoreo POS"
        description="KPIs en vivo de ventas, caja y diferencias por sucursal."
      />

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : isError || locations.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={ScanLine}
              title="Sin sucursales para monitorear"
              description="No hay terminales POS activas asociadas a tu cuenta."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {locations.map((loc) => (
            <LocationMonitorCard key={loc.id} location={loc} />
          ))}
        </div>
      )}
    </>
  );
}

function LocationMonitorCard({ location }: { location: PosLocation }) {
  const { data: reports, isLoading } = usePosReports(location.id);
  const hasOpenSession = Boolean(location.activeSessionId);

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-4 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Store className="size-4 text-primary" />
              <h3 className="text-base font-semibold">{location.name}</h3>
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {location.type}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
                hasOpenSession
                  ? "bg-emerald-500/15 text-emerald-300"
                  : "bg-muted/30 text-muted-foreground",
              )}
            >
              <Wallet className="size-3" />
              {hasOpenSession ? "Caja abierta" : "Caja cerrada"}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-20 items-center justify-center">
            <Loader2 className="size-4 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <Kpi
              label="Ventas hoy"
              value={formatCurrency(reports?.salesToday ?? 0)}
              hint={`${reports?.ordersToday ?? 0} órdenes`}
            />
            <Kpi
              label="Ventas mes"
              value={formatCurrency(reports?.salesMonth ?? 0)}
              hint={`${reports?.ordersMonth ?? 0} órdenes`}
            />
            <Kpi
              label="Ingresos hoy"
              icon={TrendingUp}
              tone="success"
              value={formatCurrency(reports?.incomeToday ?? 0)}
            />
            <Kpi
              label="Egresos hoy"
              icon={TrendingDown}
              tone="warning"
              value={formatCurrency(reports?.expenseToday ?? 0)}
            />
          </div>
        )}

        {reports && reports.cashDifferenceToday !== 0 ? (
          <div
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 text-xs",
              reports.cashDifferenceToday > 0
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                : "border-destructive/40 bg-destructive/10 text-destructive",
            )}
          >
            <AlertTriangle className="size-3.5" />
            {reports.cashDifferenceToday > 0 ? "Sobrante" : "Faltante"}{" "}
            acumulado hoy en cierres:{" "}
            {formatCurrency(Math.abs(reports.cashDifferenceToday))}
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          <Link
            href={`/pos/${location.slug}`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-surface-strong"
          >
            <ScanLine className="size-3.5" />
            Abrir terminal
            <ArrowUpRight className="size-3" />
          </Link>
          <Link
            href={`/pos/${location.slug}/caja`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-surface-strong"
          >
            <Lock className="size-3.5" />
            Detalle caja
            <ArrowUpRight className="size-3" />
          </Link>
          <Link
            href={`/pos/${location.slug}/devoluciones`}
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface/60 px-3 py-1.5 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-surface-strong"
          >
            <ArrowLeftRight className="size-3.5" />
            Devoluciones
            <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
  icon?: typeof TrendingUp;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-surface/40 p-3",
        tone === "success"
          ? "border-emerald-500/30"
          : tone === "warning"
            ? "border-amber-500/30"
            : "border-border",
      )}
    >
      <p className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
        {Icon ? <Icon className="size-3" /> : null}
        {label}
      </p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
      {hint ? <p className="text-[10px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
