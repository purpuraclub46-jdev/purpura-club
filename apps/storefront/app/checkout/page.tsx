"use client";

import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Lock,
  MapPin,
  Package,
  ShoppingBag,
  Star,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";
import { toast } from "@/stores/toast.store";
import { useMyAddresses } from "@/features/account/hooks/use-account";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCreateCheckoutSession } from "@/features/checkout/hooks/use-checkout";
import {
  selectCartCount,
  selectCartGross,
  useCartStore,
} from "@/stores/cart.store";
import { useCheckoutStore } from "@/stores/checkout.store";
import { ADDRESS_TYPE_LABEL, type AddressEntity } from "@/types/api";

export default function CheckoutPage() {
  const router = useRouter();
  const { hydrated: authHydrated, isAuthenticated } = useAuth();
  const cartItems = useCartStore((s) => s.items);
  const cartHydrated = useCartStore((s) => s.hydrated);
  const cartCount = useCartStore(selectCartCount);
  const cartGross = useCartStore(selectCartGross);
  const clearCart = useCartStore((s) => s.clear);

  const { step, selectedAddressId, setStep, setSelectedAddressId, reset } =
    useCheckoutStore();
  const { data: addresses, isLoading: addressesLoading } = useMyAddresses();
  const session = useCreateCheckoutSession();

  // Auth guard.
  useEffect(() => {
    if (authHydrated && !isAuthenticated) {
      router.replace("/login?next=/checkout");
    }
  }, [authHydrated, isAuthenticated, router]);

  // Reset al desmontar para que un nuevo checkout arranque limpio.
  useEffect(() => () => reset(), [reset]);

  // Auto-seleccionar la dirección principal SHIPPING.
  const shippingAddresses = useMemo(
    () => (addresses ?? []).filter((a) => a.type === "SHIPPING"),
    [addresses],
  );
  useEffect(() => {
    if (selectedAddressId) return;
    const first = shippingAddresses[0];
    if (!first) return;
    const def = shippingAddresses.find((a) => a.isDefault);
    setSelectedAddressId(def?.id ?? first.id);
  }, [shippingAddresses, selectedAddressId, setSelectedAddressId]);

  if (!authHydrated || !cartHydrated) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#0A0A0A]/45" />
      </div>
    );
  }

  if (cartCount === 0) {
    return (
      <div className="bg-[#FAFAFA] pb-20">
        <Container className="max-w-2xl py-12">
          <EmptyState
            icon={ShoppingBag}
            title="Tu carrito está vacío"
            description="Agrega productos antes de continuar al checkout."
            action={
              <Link href="/shop">
                <Button>Ir a la tienda</Button>
              </Link>
            }
          />
        </Container>
      </div>
    );
  }

  if (!addressesLoading && shippingAddresses.length === 0) {
    return (
      <div className="bg-[#FAFAFA] pb-20">
        <Container className="max-w-2xl space-y-5 py-10">
          <BackLink />
          <div className="lux-card rounded-2xl p-8 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#9810FA]/10 text-[#9810FA]">
              <MapPin className="size-5" />
            </div>
            <h1 className="mt-4 font-serif text-2xl tracking-tight text-[#0A0A0A]">
              Agrega una dirección para continuar
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm text-[#0A0A0A]/55">
              Necesitamos una dirección de envío antes de procesar tu pedido.
            </p>
            <Link
              href="/mi-cuenta?tab=direcciones&reason=checkout"
              className="mt-6 inline-block"
            >
              <Button>Agregar dirección</Button>
            </Link>
          </div>
        </Container>
      </div>
    );
  }

  const selectedAddress =
    shippingAddresses.find((a) => a.id === selectedAddressId) ?? null;

  async function handlePay() {
    if (!selectedAddress) return;
    try {
      const result = await session.mutateAsync({
        shippingAddressId: selectedAddress.id,
        items: cartItems.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      });

      // El carrito se vacía solo cuando confirmamos que la orden fue
      // registrada (verdict != UNSUPPORTED). El estado de pago real lo
      // resuelve el webhook (F2.6-B) y el cliente lo verá en Mis Pedidos.
      if (result.verdict !== "UNSUPPORTED") {
        clearCart();
      }

      if (result.verdict === "REDIRECT" && result.redirectUrl) {
        toast.info("Redirigiendo a la pasarela de pago…");
        window.location.assign(result.redirectUrl);
        return;
      }

      if (result.verdict === "PENDING_SETUP") {
        toast.info("Pedido registrado", result.message);
        router.push(
          `/checkout/pending?order=${encodeURIComponent(result.orderNumber)}`,
        );
        return;
      }

      // UNSUPPORTED
      toast.error("No se pudo iniciar el pago", result.message);
      router.push(
        `/checkout/failure?order=${encodeURIComponent(result.orderNumber)}`,
      );
    } catch (err) {
      const message =
        (err as { response?: { data?: { message?: string } } } | null)?.response
          ?.data?.message ?? "Intenta nuevamente en unos segundos.";
      toast.error("No se pudo crear el pedido", message);
    }
  }

  return (
    <div className="bg-[#FAFAFA] pb-20">
      <Container className="max-w-2xl space-y-6 py-8 sm:py-10">
        <BackLink />

        <Stepper current={step} />

        {step === "address" ? (
          <AddressStep
            loading={addressesLoading}
            addresses={shippingAddresses}
            selectedId={selectedAddressId}
            onSelect={setSelectedAddressId}
            onContinue={() => setStep("summary")}
          />
        ) : null}

        {step === "summary" ? (
          <SummaryStep
            address={selectedAddress}
            cartItems={cartItems}
            cartGross={cartGross}
            onBack={() => setStep("address")}
            onContinue={() => setStep("paying")}
          />
        ) : null}

        {step === "paying" ? (
          <PayStep
            address={selectedAddress}
            cartGross={cartGross}
            isPending={session.isPending}
            onBack={() => setStep("summary")}
            onPay={handlePay}
          />
        ) : null}
      </Container>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      href="/shop"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0A0A0A]/55 transition-colors hover:text-[#0A0A0A]"
    >
      <ArrowLeft className="size-3.5" />
      Volver a la tienda
    </Link>
  );
}

function Stepper({ current }: { current: "address" | "summary" | "paying" }) {
  const steps = [
    { key: "address", label: "Dirección" },
    { key: "summary", label: "Resumen" },
    { key: "paying", label: "Pagar" },
  ] as const;
  const currentIndex = steps.findIndex((s) => s.key === current);

  return (
    <ol className="flex items-center gap-2">
      {steps.map((s, idx) => {
        const done = idx < currentIndex;
        const active = idx === currentIndex;
        return (
          <li key={s.key} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full text-[11px] font-semibold",
                done && "bg-[#9810FA] text-white",
                active && "bg-[#9810FA]/10 text-[#9810FA]",
                !done && !active && "bg-[#11111108] text-[#0A0A0A]/45",
              )}
            >
              {done ? <CheckCircle2 className="size-3.5" /> : idx + 1}
            </span>
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.22em]",
                active ? "text-[#0A0A0A]" : "text-[#0A0A0A]/45",
              )}
            >
              {s.label}
            </span>
            {idx < steps.length - 1 ? (
              <span className="ml-1 h-px flex-1 bg-[#11111114]" />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function AddressStep({
  loading,
  addresses,
  selectedId,
  onSelect,
  onContinue,
}: {
  loading: boolean;
  addresses: AddressEntity[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl tracking-tight text-[#0A0A0A] sm:text-3xl">
          Elige una dirección de envío
        </h1>
        <p className="text-sm text-[#0A0A0A]/55">
          Usaremos esta dirección para entregarte tu pedido.
        </p>
      </header>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((a) => (
            <li key={a.id}>
              <label
                className={cn(
                  "lux-card flex cursor-pointer items-start gap-3 rounded-2xl p-5 transition-colors",
                  selectedId === a.id && "border-[#9810FA]/40 bg-[#9810FA]/4",
                )}
              >
                <input
                  type="radio"
                  name="address"
                  value={a.id}
                  checked={selectedId === a.id}
                  onChange={() => onSelect(a.id)}
                  className="mt-1 size-4 accent-[#9810FA]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-[#0A0A0A]">
                      {a.label || ADDRESS_TYPE_LABEL[a.type]}
                    </p>
                    {a.isDefault ? (
                      <Badge tone="accentSoft">
                        <Star className="size-2.5" />
                        Principal
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[#0A0A0A]/55">
                    {a.recipientName} · {a.recipientPhone}
                  </p>
                  <p className="mt-2 text-sm text-[#0A0A0A]">
                    {a.street} {a.number}
                    {a.apartment ? `, ${a.apartment}` : ""}
                  </p>
                  <p className="text-sm text-[#0A0A0A]/65">
                    {a.district}, {a.province}, {a.region}
                  </p>
                </div>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end">
        <Link
          href="/mi-cuenta?tab=direcciones"
          className="text-xs text-[#9810FA] hover:underline"
        >
          Administrar mis direcciones
        </Link>
      </div>

      <div className="flex justify-end">
        <Button disabled={!selectedId} onClick={onContinue}>
          Continuar
        </Button>
      </div>
    </div>
  );
}

function SummaryStep({
  address,
  cartItems,
  cartGross,
  onBack,
  onContinue,
}: {
  address: AddressEntity | null;
  cartItems: ReturnType<typeof useCartStore.getState>["items"];
  cartGross: number;
  onBack: () => void;
  onContinue: () => void;
}) {
  if (!address) return null;
  const igvRate = 18;
  const subtotalUntaxed = Math.round((cartGross / (1 + igvRate / 100)) * 100) /
    100;
  const igvAmount = Math.round((cartGross - subtotalUntaxed) * 100) / 100;

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl tracking-tight text-[#0A0A0A] sm:text-3xl">
          Revisa tu pedido
        </h1>
        <p className="text-sm text-[#0A0A0A]/55">
          Confirma los detalles antes de pagar.
        </p>
      </header>

      <div className="lux-card rounded-2xl p-5 sm:p-6">
        <SectionLabel icon={MapPin} label="Enviar a" />
        <p className="mt-3 text-sm font-medium text-[#0A0A0A]">
          {address.recipientName}
        </p>
        <p className="text-xs text-[#0A0A0A]/55">{address.recipientPhone}</p>
        <p className="mt-2 text-sm text-[#0A0A0A]">
          {address.street} {address.number}
          {address.apartment ? `, ${address.apartment}` : ""}
        </p>
        <p className="text-sm text-[#0A0A0A]/65">
          {address.district}, {address.province}, {address.region}
        </p>
      </div>

      <div className="lux-card rounded-2xl p-5 sm:p-6">
        <SectionLabel icon={Package} label="Productos" />
        <ul className="mt-4 divide-y divide-[#11111110]">
          {cartItems.map((it) => (
            <li
              key={it.productId}
              className="flex items-start gap-3 py-4 first:pt-1"
            >
              <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#9810FA]/8 text-[#9810FA]">
                <Package className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-[#0A0A0A]">
                  {it.name}
                </p>
                <p className="mt-0.5 text-xs text-[#0A0A0A]/55">
                  {it.quantity} × {formatCurrency(it.unitPrice)}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-[#0A0A0A]">
                {formatCurrency(it.unitPrice * it.quantity)}
              </p>
            </li>
          ))}
        </ul>
      </div>

      <div className="lux-card rounded-2xl p-5 sm:p-6">
        <SectionLabel icon={ShoppingBag} label="Resumen" />
        <dl className="mt-4 space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-[#0A0A0A]/65">Subtotal sin IGV</dt>
            <dd className="tabular-nums text-[#0A0A0A]/65">
              {formatCurrency(subtotalUntaxed)}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-[#0A0A0A]/65">IGV (18%)</dt>
            <dd className="tabular-nums text-[#0A0A0A]/55">
              {formatCurrency(igvAmount)}
            </dd>
          </div>
        </dl>
        <div className="mt-4 border-t border-[#11111114] pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
              Total
            </span>
            <span className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
              {formatCurrency(cartGross)}
            </span>
          </div>
          <p className="mt-2 text-[10px] text-[#0A0A0A]/45">
            Los precios finales se confirman al crear el pedido en base al
            catálogo vigente.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack}>
          Cambiar dirección
        </Button>
        <Button onClick={onContinue}>Continuar al pago</Button>
      </div>
    </div>
  );
}

function PayStep({
  address,
  cartGross,
  isPending,
  onBack,
  onPay,
}: {
  address: AddressEntity | null;
  cartGross: number;
  isPending: boolean;
  onBack: () => void;
  onPay: () => void;
}) {
  if (!address) return null;
  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h1 className="font-serif text-2xl tracking-tight text-[#0A0A0A] sm:text-3xl">
          Confirma y paga
        </h1>
        <p className="text-sm text-[#0A0A0A]/55">
          Vamos a crear tu pedido y redirigirte a la pasarela de pago.
        </p>
      </header>

      <div className="lux-card rounded-2xl p-5 sm:p-6">
        <SectionLabel icon={Lock} label="Pago seguro" />
        <p className="mt-3 text-sm text-[#0A0A0A]">
          El cobro lo procesa Mercado Pago. Tu pedido quedará registrado en
          estado <strong>Pendiente</strong> hasta confirmar el pago.
        </p>
        <div className="mt-5 flex items-end justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
            Total a pagar
          </span>
          <span className="font-serif text-3xl tracking-tight tabular-nums text-[#0A0A0A]">
            {formatCurrency(cartGross)}
          </span>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs text-amber-800">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          La pasarela de pago aún se está configurando. Tu pedido se
          registrará y nos pondremos en contacto contigo para completar el
          cobro.
        </span>
      </div>

      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onBack} disabled={isPending}>
          Atrás
        </Button>
        <Button onClick={onPay} isLoading={isPending}>
          {isPending ? <Loader2 className="size-3.5 animate-spin" /> : null}
          Pagar {formatCurrency(cartGross)}
        </Button>
      </div>
    </div>
  );
}

function SectionLabel({
  icon: Icon,
  label,
}: {
  icon: typeof MapPin;
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
