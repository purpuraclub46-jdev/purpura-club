"use client";

import { Clock, Receipt, XCircle, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { cn } from "@/shared/lib/cn";

/**
 * Pantalla de resultado del checkout. La FUENTE DE VERDAD del estado de
 * pago es siempre el backend (vía Mis Pedidos). Esta pantalla es solo UX.
 *
 * NO hace polling de estado y NO modifica nada del lado servidor. Los
 * back_urls de la pasarela solo dirigen al cliente aquí; el webhook
 * (F2.6-B) es quien actualiza Order.status.
 */
type Kind = "success" | "pending" | "failure";

const COPY: Record<
  Kind,
  {
    icon: LucideIcon;
    iconTone: string;
    title: string;
    description: (orderNumber: string | null) => string;
    primaryCta: { label: string; href: (n: string | null) => string };
    secondaryCta?: { label: string; href: string };
  }
> = {
  success: {
    icon: Receipt,
    iconTone: "bg-emerald-50 text-emerald-700",
    title: "Tu pedido fue registrado",
    description: () =>
      "Confirmaremos tu pago en breve y te avisaremos por correo. Puedes seguir el estado desde Mis pedidos.",
    primaryCta: {
      label: "Ver mi pedido",
      href: (n) =>
        n
          ? `/mi-cuenta/pedidos/${encodeURIComponent(n)}`
          : "/mi-cuenta?tab=pedidos",
    },
    secondaryCta: { label: "Seguir comprando", href: "/shop" },
  },
  pending: {
    icon: Clock,
    iconTone: "bg-amber-50 text-amber-700",
    title: "Tu pedido está pendiente",
    description: () =>
      "Hemos registrado tu pedido. Estamos finalizando la conexión con la pasarela de pago — nos pondremos en contacto contigo para completar el cobro.",
    primaryCta: {
      label: "Ver mi pedido",
      href: (n) =>
        n
          ? `/mi-cuenta/pedidos/${encodeURIComponent(n)}`
          : "/mi-cuenta?tab=pedidos",
    },
    secondaryCta: { label: "Seguir comprando", href: "/shop" },
  },
  failure: {
    icon: XCircle,
    iconTone: "bg-rose-50 text-rose-700",
    title: "No pudimos procesar tu pago",
    description: () =>
      "Tu pedido sigue en estado Pendiente y nada fue cobrado. Puedes intentar de nuevo desde la tienda o contactarnos.",
    primaryCta: {
      label: "Volver a la tienda",
      href: () => "/shop",
    },
    secondaryCta: { label: "Ver mis pedidos", href: "/mi-cuenta?tab=pedidos" },
  },
};

export function CheckoutResultScreen({ kind }: { kind: Kind }) {
  const params = useSearchParams();
  const orderNumber = params?.get("order") ?? null;
  const copy = COPY[kind];
  const Icon = copy.icon;

  return (
    <div className="bg-[#FAFAFA] pb-20">
      <Container className="max-w-xl space-y-6 py-12 sm:py-16">
        <div className="lux-card rounded-2xl p-8 text-center sm:p-10">
          <div
            className={cn(
              "mx-auto flex size-14 items-center justify-center rounded-full",
              copy.iconTone,
            )}
          >
            <Icon className="size-6" />
          </div>
          <h1 className="mt-5 font-serif text-3xl tracking-tight text-[#0A0A0A]">
            {copy.title}
          </h1>
          <p className="mx-auto mt-3 max-w-md text-sm text-[#0A0A0A]/55">
            {copy.description(orderNumber)}
          </p>
          {orderNumber ? (
            <p className="mt-4 font-mono text-xs text-[#0A0A0A]/55">
              Pedido #{orderNumber}
            </p>
          ) : null}
          <div className="mt-7 flex flex-wrap justify-center gap-2">
            <Link href={copy.primaryCta.href(orderNumber)}>
              <Button>{copy.primaryCta.label}</Button>
            </Link>
            {copy.secondaryCta ? (
              <Link href={copy.secondaryCta.href}>
                <Button variant="outline">{copy.secondaryCta.label}</Button>
              </Link>
            ) : null}
          </div>
        </div>
      </Container>
    </div>
  );
}
