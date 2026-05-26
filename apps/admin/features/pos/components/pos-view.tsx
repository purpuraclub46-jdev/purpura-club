"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpRight,
  Loader2,
  Lock,
  Receipt,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { extractErrorMessage } from "@/services/http/client";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";
import { toast } from "@/stores/toast.store";
import type { ProductEntity } from "@/features/products/types";
import type { CustomerEntity } from "@/features/customers/types";
import {
  useCreatePosSale,
  usePosActiveSession,
  usePosLocation,
  usePosReports,
} from "../hooks/use-pos";
import type {
  CashSession,
  CreatePosSalePayload,
  ManualMovementType,
  PosLocation,
  PosSale,
  PosSaleCustomerFiscalPayload,
  PosSalePaymentPayload,
} from "../types";
import type { ReceiptSeriesType } from "@/types/api";
import { Cart, type CartLine } from "./cart";
import { CashMovementDialog } from "./cash-movement-dialog";
import { CloseSessionDialog } from "./close-session-dialog";
import { CustomerPicker } from "./customer-picker";
import { OpenSessionDialog } from "./open-session-dialog";
import { PaymentDialog } from "./payment-dialog";
import { ProductSearch } from "./product-search";
import { SaleSuccessDialog } from "./sale-success-dialog";

interface Props {
  slug: string;
}

const round2 = (v: number): number => Math.round(v * 100) / 100;

// IGV Perú — la tasa real se valida en el backend. El frontend muestra el
// breakdown estimado al cajero para que coincida con lo que cobrará.
const IGV_RATE = 18;

export function PosView({ slug }: Props) {
  const { data: location, isLoading: locLoading, isError } = usePosLocation(slug);
  const locationId = location?.id;
  const {
    data: session,
    isLoading: sessionLoading,
  } = usePosActiveSession(locationId);
  const { data: reports } = usePosReports(locationId);
  const createSale = useCreatePosSale();

  const [lines, setLines] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerEntity | null>(null);
  const [discount, setDiscount] = useState(0);
  const [openSessionOpen, setOpenSessionOpen] = useState(false);
  const [closeSessionOpen, setCloseSessionOpen] = useState(false);
  const [movementOpen, setMovementOpen] = useState(false);
  const [movementType, setMovementType] = useState<ManualMovementType>("INCOME");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [lastSale, setLastSale] = useState<PosSale | null>(null);

  const subtotal = useMemo(
    () => round2(lines.reduce((acc, l) => acc + l.unitPrice * l.quantity, 0)),
    [lines],
  );
  const safeDiscount = Math.min(Math.max(0, discount), subtotal);
  const total = round2(subtotal - safeDiscount);
  // Desglose IGV — precios incluyen IGV (estándar Perú retail).
  const igvFactor = 1 + IGV_RATE / 100;
  const subtotalUntaxed = round2(total / igvFactor);
  const igvAmount = round2(total - subtotalUntaxed);

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

  // Si no hay sesión abierta, mostramos pantalla de apertura
  if (!sessionLoading && !session) {
    return (
      <>
        <HeaderBar location={location} session={null} reports={reports} />
        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <Lock className="size-10 text-muted-foreground" />
            <div className="space-y-1">
              <h3 className="text-lg font-semibold">Caja cerrada</h3>
              <p className="max-w-md text-sm text-muted-foreground">
                Antes de vender, abre la caja registrando el monto inicial en
                efectivo. Todas las ventas y movimientos quedarán auditados en
                la sesión.
              </p>
            </div>
            <Button size="lg" onClick={() => setOpenSessionOpen(true)}>
              Abrir caja
            </Button>
          </CardContent>
        </Card>
        <OpenSessionDialog
          locationId={location.id}
          open={openSessionOpen}
          onOpenChange={setOpenSessionOpen}
        />
      </>
    );
  }

  if (sessionLoading || !session) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // ─── Cart actions ──────────────────────────────────────────────────────

  const addProduct = (product: ProductEntity) => {
    const stockEntry = product.availability.find(
      (a) => a.inventoryLocationId === location.id,
    );
    const stock = stockEntry?.stock ?? 0;
    if (stock <= 0) return;

    setLines((prev) => {
      const existing = prev.find((l) => l.productId === product.id);
      if (existing) {
        if (existing.quantity >= stock) {
          toast.error("Stock insuficiente");
          return prev;
        }
        return prev.map((l) =>
          l.productId === product.id ? { ...l, quantity: l.quantity + 1 } : l,
        );
      }
      // Usamos finalPrice (ya incluye descuento miembro si aplica al solicitante)
      // pero acá NO sabemos si el solicitante actual es miembro. El backend
      // recalcula con el cliente real al confirmar; este precio es referencial.
      return [
        ...prev,
        {
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          quantity: 1,
          unitPrice:
            customer?.isMember && product.memberPrice
              ? product.memberPrice
              : (product.salePrice ?? product.price),
          isMemberPrice: Boolean(customer?.isMember && product.memberPrice),
          stock,
        },
      ];
    });
  };

  const updateQuantity = (productId: string, quantity: number) => {
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId
          ? { ...l, quantity: Math.min(quantity, l.stock) }
          : l,
      ),
    );
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const clearCart = () => {
    setLines([]);
    setCustomer(null);
    setDiscount(0);
  };

  const submitSale = async (args: {
    payments: PosSalePaymentPayload[];
    receiptType: ReceiptSeriesType;
    customerFiscal?: PosSaleCustomerFiscalPayload;
  }) => {
    if (lines.length === 0) return;
    const payload: CreatePosSalePayload = {
      cashSessionId: session.id,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: l.quantity,
      })),
      payments: args.payments,
      manualDiscount: safeDiscount > 0 ? safeDiscount : undefined,
      customerId: customer?.id,
      receiptType: args.receiptType,
      customerFiscal: args.customerFiscal,
    };
    try {
      const sale = await createSale.mutateAsync(payload);
      toast.success(`Venta ${sale.number}`);
      setLastSale(sale);
      setPaymentOpen(false);
      clearCart();
    } catch (e) {
      toast.error("No se pudo registrar la venta", extractErrorMessage(e));
    }
  };

  // ─── Render principal ──────────────────────────────────────────────────

  return (
    <>
      <HeaderBar
        location={location}
        session={session}
        reports={reports}
        onOpenIncome={() => {
          setMovementType("INCOME");
          setMovementOpen(true);
        }}
        onOpenExpense={() => {
          setMovementType("EXPENSE");
          setMovementOpen(true);
        }}
        onClose={() => setCloseSessionOpen(true)}
      />

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="xl:col-span-7">
          <CardContent className="h-[calc(100vh-22rem)] pt-4 xl:h-[calc(100vh-18rem)]">
            <ProductSearch
              locationId={location.id}
              onAdd={addProduct}
            />
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 xl:col-span-5">
          <CustomerPicker customer={customer} onChange={setCustomer} />

          <Card className="flex-1">
            <CardContent className="flex h-[calc(100vh-30rem)] flex-col pt-4 xl:h-[calc(100vh-22rem)]">
              <Cart
                lines={lines}
                onQuantityChange={updateQuantity}
                onRemove={removeLine}
                subtotal={subtotal}
                discount={safeDiscount}
                total={total}
                subtotalUntaxed={subtotalUntaxed}
                igvAmount={igvAmount}
                igvRate={IGV_RATE}
                onDiscountChange={setDiscount}
                disabled={createSale.isPending}
              />
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="h-14 text-base"
            disabled={lines.length === 0 || createSale.isPending}
            onClick={() => setPaymentOpen(true)}
          >
            <Receipt className="size-5" />
            Cobrar {formatCurrency(total)}
          </Button>
        </div>
      </div>

      <PaymentDialog
        open={paymentOpen}
        total={total}
        subtotalUntaxed={subtotalUntaxed}
        igvAmount={igvAmount}
        igvRate={IGV_RATE}
        customer={customer}
        isLoading={createSale.isPending}
        onOpenChange={setPaymentOpen}
        onConfirm={(payload) => void submitSale(payload)}
      />

      <SaleSuccessDialog
        sale={lastSale}
        open={Boolean(lastSale)}
        onOpenChange={(o) => {
          if (!o) setLastSale(null);
        }}
      />

      <CashMovementDialog
        sessionId={session.id}
        initialType={movementType}
        open={movementOpen}
        onOpenChange={setMovementOpen}
      />

      <CloseSessionDialog
        session={session}
        open={closeSessionOpen}
        onOpenChange={setCloseSessionOpen}
      />
    </>
  );
}

// ─── Header reutilizable ────────────────────────────────────────────────────

interface HeaderProps {
  location: PosLocation;
  session: CashSession | null;
  reports: ReturnType<typeof usePosReports>["data"];
  onOpenIncome?: () => void;
  onOpenExpense?: () => void;
  onClose?: () => void;
}

function HeaderBar({
  location,
  session,
  reports,
  onOpenIncome,
  onOpenExpense,
  onClose,
}: HeaderProps) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#9810FA]">
            POS · {location.type}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-[#0A0A0A]">
            {location.name}
          </h1>
          <p className="text-xs text-[#0A0A0A]/55">
            {session ? (
              <>
                Caja abierta por{" "}
                <span className="font-medium text-[#0A0A0A]/80">
                  {session.openedBy.firstName} {session.openedBy.lastName}
                </span>
              </>
            ) : (
              <>Caja cerrada</>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {session ? (
            <>
              <Button variant="outline" size="sm" onClick={onOpenIncome}>
                <TrendingUp className="size-4" /> Ingreso
              </Button>
              <Button variant="outline" size="sm" onClick={onOpenExpense}>
                <TrendingDown className="size-4" /> Egreso
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link href={`/pos/${location.slug}/caja`}>
                  <ArrowUpRight className="size-4" /> Detalle caja
                </Link>
              </Button>
              <Button variant="destructive" size="sm" onClick={onClose}>
                <Lock className="size-4" /> Cerrar caja
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
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
          value={formatCurrency(reports?.incomeToday ?? 0)}
          tone="success"
        />
        <Kpi
          label="Egresos hoy"
          value={formatCurrency(reports?.expenseToday ?? 0)}
          tone="warning"
        />
      </div>

      {reports && reports.cashDifferenceToday !== 0 ? (
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border px-3 py-2 text-xs",
            reports.cashDifferenceToday > 0
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-rose-200 bg-rose-50 text-rose-700",
          )}
        >
          <AlertTriangle className="size-3.5" />
          {reports.cashDifferenceToday > 0 ? "Sobrante" : "Faltante"} acumulado
          hoy en cierres: {formatCurrency(Math.abs(reports.cashDifferenceToday))}
        </div>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "success" | "warning";
}) {
  const accentClasses =
    tone === "success"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-amber-600"
        : "text-[#9810FA]";
  return (
    <div className="lux-card rounded-xl p-4">
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.2em]",
          accentClasses,
        )}
      >
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold tabular-nums text-[#0A0A0A]">
        {value}
      </p>
      {hint ? (
        <p className="mt-0.5 text-[10px] text-[#0A0A0A]/50">{hint}</p>
      ) : null}
    </div>
  );
}
