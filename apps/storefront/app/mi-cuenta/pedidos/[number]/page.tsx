"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CreditCard,
  FileText,
  Loader2,
  Package,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/format";
import { useMyOrder } from "@/features/account/hooks/use-account";
import { useAuth } from "@/features/auth/hooks/use-auth";
import {
  ORDER_PAYMENT_METHOD_LABEL,
  ORDER_STATUS_LABEL,
  RECEIPT_TYPE_LABEL,
  type OrderEntity,
  type OrderStatus,
} from "@/types/api";

const ORDER_STATUS_TONE: Record<
  OrderStatus,
  "warning" | "success" | "default" | "outline"
> = {
  PENDING: "warning",
  PAID: "success",
  CANCELLED: "default",
  REFUNDED: "outline",
};

export default function OrderDetailPage() {
  const params = useParams<{ number: string }>();
  const router = useRouter();
  const { isAuthenticated, hydrated } = useAuth();
  const numberParam = decodeURIComponent(params?.number ?? "");

  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace(
        `/login?next=${encodeURIComponent(`/mi-cuenta/pedidos/${numberParam}`)}`,
      );
    }
  }, [hydrated, isAuthenticated, router, numberParam]);

  const { data, isLoading, isError, error } = useMyOrder(numberParam);

  if (!hydrated) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#0A0A0A]/45" />
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAFA] pb-20">
      <Container className="max-w-2xl space-y-6 py-8 sm:py-10">
        <BackLink />

        {isLoading ? (
          <OrderDetailSkeleton />
        ) : isError ? (
          <OrderDetailError error={error} number={numberParam} />
        ) : data ? (
          <OrderDetailContent order={data} />
        ) : null}
      </Container>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/mi-cuenta?tab=pedidos"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A]"
    >
      <ArrowLeft className="size-3.5" />
      Volver a Mis pedidos
    </Link>
  );
}

function OrderDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-48 w-full rounded-2xl" />
      <Skeleton className="h-32 w-full rounded-2xl" />
    </div>
  );
}

function OrderDetailError({
  error,
  number,
}: {
  error: unknown;
  number: string;
}) {
  const status = (error as { response?: { status?: number } } | null)?.response
    ?.status;
  const notFound = status === 404;

  return (
    <div className="lux-card rounded-2xl p-8 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#0A0A0A]/5 text-[#0A0A0A]/55">
        <AlertTriangle className="size-5" />
      </div>
      <h1 className="mt-4 font-serif text-2xl tracking-tight text-[#0A0A0A]">
        {notFound ? "Pedido no encontrado" : "No pudimos cargar el pedido"}
      </h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[#0A0A0A]/55">
        {notFound
          ? `El pedido #${number} no existe o no está asociado a tu cuenta.`
          : "Intenta de nuevo en unos segundos. Si el problema persiste, contáctanos."}
      </p>
      <Link href="/mi-cuenta?tab=pedidos" className="mt-6 inline-block">
        <Button variant="outline">Volver al historial</Button>
      </Link>
    </div>
  );
}

function OrderDetailContent({ order }: { order: OrderEntity }) {
  const itemsCount = order.items.reduce((acc, i) => acc + i.quantity, 0);
  return (
    <div className="space-y-4">
      <OrderHeaderCard order={order} itemsCount={itemsCount} />
      <ItemsCard order={order} itemsCount={itemsCount} />
      <TotalsCard order={order} />
      <PaymentCard order={order} />
      {order.receipt ? <ReceiptCard order={order} /> : null}
      {order.notes ? <NotesCard notes={order.notes} /> : null}
      <p className="flex items-center gap-1.5 px-1 text-[10px] uppercase tracking-[0.22em] text-[#0A0A0A]/45">
        <ShieldCheck className="size-3 text-[#9810FA]" />
        Información protegida — pertenece únicamente a tu cuenta.
      </p>
    </div>
  );
}

function OrderHeaderCard({
  order,
  itemsCount,
}: {
  order: OrderEntity;
  itemsCount: number;
}) {
  return (
    <div className="lux-card rounded-2xl p-6 sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/45">
            Pedido
          </p>
          <p className="mt-1 font-mono text-sm text-[#0A0A0A]">
            #{order.number}
          </p>
        </div>
        <Badge tone={ORDER_STATUS_TONE[order.status]}>
          {ORDER_STATUS_LABEL[order.status]}
        </Badge>
      </div>

      <p className="mt-4 text-xs text-[#0A0A0A]/55">
        Realizado el {formatDateTime(order.createdAt)}
      </p>

      <div className="mt-5 flex items-end justify-between gap-3">
        <p className="font-serif text-3xl tracking-tight tabular-nums text-[#0A0A0A]">
          {formatCurrency(order.total)}
        </p>
        <p className="text-xs text-[#0A0A0A]/55">
          {itemsCount} {itemsCount === 1 ? "producto" : "productos"}
        </p>
      </div>
    </div>
  );
}

function ItemsCard({
  order,
  itemsCount,
}: {
  order: OrderEntity;
  itemsCount: number;
}) {
  return (
    <div className="lux-card rounded-2xl p-5 sm:p-6">
      <CardSectionLabel icon={Package} label="Productos" />
      <ul className="mt-4 divide-y divide-[#11111110]">
        {order.items.map((item) => (
          <li key={item.id} className="flex items-start gap-3 py-4 first:pt-1">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#9810FA]/8 text-[#9810FA]">
              <Package className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[#0A0A0A]">
                {item.productName}
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[#0A0A0A]/45">
                {item.productSku}
              </p>
              <p className="mt-1 text-xs text-[#0A0A0A]/55">
                {item.quantity} × {formatCurrency(item.unitPrice)}
              </p>
            </div>
            <p className="shrink-0 text-sm font-semibold tabular-nums text-[#0A0A0A]">
              {formatCurrency(item.subtotal)}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-[#0A0A0A]/45">
        Total · {itemsCount} {itemsCount === 1 ? "unidad" : "unidades"}
      </p>
    </div>
  );
}

function TotalsCard({ order }: { order: OrderEntity }) {
  return (
    <div className="lux-card rounded-2xl p-5 sm:p-6">
      <CardSectionLabel icon={FileText} label="Resumen" />
      <dl className="mt-4 space-y-2 text-sm">
        <TotalsRow label="Subtotal" value={formatCurrency(order.subtotal)} />
        {order.discount > 0 ? (
          <TotalsRow
            label="Descuento"
            value={`- ${formatCurrency(order.discount)}`}
            accent
          />
        ) : null}
        <TotalsRow
          label={`IGV (${Number(order.fiscal.igvRate).toFixed(0)}%)`}
          value={formatCurrency(order.fiscal.igvAmount)}
          muted
        />
      </dl>
      <div className="mt-4 border-t border-[#11111114] pt-4">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
            Total
          </span>
          <span className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
            {formatCurrency(order.total)}
          </span>
        </div>
      </div>
    </div>
  );
}

function TotalsRow({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt
        className={cn(
          "text-[#0A0A0A]/65",
          muted && "text-[#0A0A0A]/45",
          accent && "text-[#9810FA]",
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          "tabular-nums text-[#0A0A0A]",
          muted && "text-[#0A0A0A]/55",
          accent && "text-[#9810FA]",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

function PaymentCard({ order }: { order: OrderEntity }) {
  return (
    <div className="lux-card rounded-2xl p-5 sm:p-6">
      <CardSectionLabel icon={CreditCard} label="Pago" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <KeyValue
          label="Método"
          value={ORDER_PAYMENT_METHOD_LABEL[order.paymentMethod]}
        />
        <KeyValue
          label="Estado"
          value={ORDER_STATUS_LABEL[order.status]}
          tone={
            order.status === "PAID"
              ? "success"
              : order.status === "PENDING"
                ? "warning"
                : undefined
          }
        />
      </div>
    </div>
  );
}

function ReceiptCard({ order }: { order: OrderEntity }) {
  const { receipt } = order;
  if (!receipt) return null;
  return (
    <div className="lux-card rounded-2xl p-5 sm:p-6">
      <CardSectionLabel icon={FileText} label="Comprobante" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <KeyValue label="Tipo" value={RECEIPT_TYPE_LABEL[receipt.type]} />
        <KeyValue label="Número" value={receipt.formatted} mono />
        <KeyValue
          label="Emitido el"
          value={formatDate(receipt.issuedAt)}
        />
        {order.fiscalSnapshot.documentNumber ? (
          <KeyValue
            label={order.fiscalSnapshot.documentType ?? "Documento"}
            value={order.fiscalSnapshot.documentNumber}
            mono
          />
        ) : null}
        {order.fiscalSnapshot.legalName ? (
          <KeyValue
            label="A nombre de"
            value={order.fiscalSnapshot.legalName}
          />
        ) : null}
        {order.fiscalSnapshot.fiscalAddress ? (
          <KeyValue
            label="Dirección fiscal"
            value={order.fiscalSnapshot.fiscalAddress}
          />
        ) : null}
      </div>
    </div>
  );
}

function NotesCard({ notes }: { notes: string }) {
  return (
    <div className="lux-card rounded-2xl p-5 sm:p-6">
      <CardSectionLabel icon={FileText} label="Notas" />
      <p className="mt-3 whitespace-pre-line text-sm text-[#0A0A0A]/75">
        {notes}
      </p>
    </div>
  );
}

function CardSectionLabel({
  icon: Icon,
  label,
}: {
  icon: typeof Package;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-[#9810FA]" />
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
        {label}
      </p>
    </div>
  );
}

function KeyValue({
  label,
  value,
  mono,
  tone,
}: {
  label: string;
  value: string;
  mono?: boolean;
  tone?: "success" | "warning";
}) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0A0A0A]/55">
        {label}
      </p>
      <p
        className={cn(
          "text-sm font-medium",
          tone === "success" && "text-emerald-700",
          tone === "warning" && "text-amber-700",
          !tone && "text-[#0A0A0A]",
          mono && "font-mono",
        )}
      >
        {value}
      </p>
    </div>
  );
}
