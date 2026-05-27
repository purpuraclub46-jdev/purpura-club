"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  ImageOff,
  Minus,
  Plus,
  ShoppingBag,
  Ticket,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";
import { splitGross } from "@/shared/lib/fiscal";
import {
  amountToNextTicket,
  computePurchaseTickets,
  MIN_PURCHASE_FOR_TICKETS,
} from "@/shared/lib/tickets";
import {
  selectCartGross,
  useCartStore,
  type CartItem,
} from "@/stores/cart.store";
import { toast } from "@/stores/toast.store";
import { useAuth } from "@/features/auth/hooks/use-auth";

export function CartDrawer() {
  const items = useCartStore((s) => s.items);
  const isOpen = useCartStore((s) => s.isOpen);
  const close = useCartStore((s) => s.closeDrawer);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const remove = useCartStore((s) => s.remove);
  const gross = useCartStore(selectCartGross);
  const breakdown = splitGross(gross);
  const { isAuthenticated } = useAuth();

  const isEmpty = items.length === 0;
  const totalUnits = items.reduce((acc, i) => acc + i.quantity, 0);

  // ─── Tickets reales (regla espejo del backend) ──────────────────────────
  const tickets = computePurchaseTickets(breakdown.total);
  const toNextTicket = amountToNextTicket(breakdown.total);
  // Progress = avance dentro del "tramo" actual de S/25.
  // Si aún no llega al mínimo, llena gradualmente hacia él.
  // Si ya pasó, llena dentro del bracket S/25 actual.
  const ticketProgress = (() => {
    if (breakdown.total <= 0) return 0;
    if (breakdown.total < MIN_PURCHASE_FOR_TICKETS) {
      return Math.min(100, (breakdown.total / MIN_PURCHASE_FOR_TICKETS) * 100);
    }
    const into = breakdown.total % MIN_PURCHASE_FOR_TICKETS;
    return into === 0 ? 100 : (into / MIN_PURCHASE_FOR_TICKETS) * 100;
  })();

  const handleCheckout = () => {
    if (isEmpty) return;
    if (!isAuthenticated) {
      toast.info(
        "Inicia sesión para continuar",
        "Necesitas una cuenta del Club Púrpura para completar tu pedido.",
      );
      close();
      return;
    }
    toast.info(
      "Checkout en desarrollo",
      "Esta funcionalidad estará disponible muy pronto. Tu carrito quedó guardado.",
    );
  };

  return (
    <AnimatePresence>
      {isOpen ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={close}
            className="fixed inset-0 z-50 bg-[#0A0A0A]/35 backdrop-blur-sm"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-label="Carrito"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col bg-white shadow-[0_0_60px_-12px_rgba(17,17,17,0.22)]"
          >
            <Header
              count={totalUnits}
              isEmpty={isEmpty}
              onClose={close}
            />

            {!isEmpty ? (
              <TicketsBand
                tickets={tickets}
                toNextTicket={toNextTicket}
                progress={ticketProgress}
              />
            ) : null}

            <div className="flex-1 overflow-y-auto">
              {isEmpty ? (
                <EmptyContent onClose={close} />
              ) : (
                <ul className="divide-y divide-[#1111110a] px-5">
                  {items.map((item) => (
                    <CartLineRow
                      key={item.productId}
                      item={item}
                      onQty={(q) => setQuantity(item.productId, q)}
                      onRemove={() => remove(item.productId)}
                      onNavigate={close}
                    />
                  ))}
                </ul>
              )}
            </div>

            {!isEmpty ? (
              <Summary
                breakdown={breakdown}
                onCheckout={handleCheckout}
                onContinue={close}
              />
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

// ─── Header ──────────────────────────────────────────────────────────────

function Header({
  count,
  isEmpty,
  onClose,
}: {
  count: number;
  isEmpty: boolean;
  onClose: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-3 border-b border-[#1111110d] px-5 pb-4 pt-5">
      <div className="space-y-0.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#9810FA]">
          Tu carrito
        </p>
        <p className="font-serif text-[20px] tracking-tight text-[#0A0A0A]">
          {isEmpty
            ? "0 productos"
            : `${count} producto${count === 1 ? "" : "s"}`}
        </p>
      </div>
      <button
        onClick={onClose}
        aria-label="Cerrar"
        className="-mr-1.5 -mt-0.5 inline-flex size-8 items-center justify-center rounded-full text-[#0A0A0A]/55 transition-colors duration-200 hover:bg-[#11111108] hover:text-[#0A0A0A]"
      >
        <X className="size-4" strokeWidth={1.4} />
      </button>
    </header>
  );
}

// ─── Tickets band (reemplaza shipping bar) ────────────────────────────────

function TicketsBand({
  tickets,
  toNextTicket,
  progress,
}: {
  tickets: number;
  toNextTicket: number;
  progress: number;
}) {
  const hasTickets = tickets > 0;
  return (
    <div className="relative overflow-hidden border-b border-[#1111110d]">
      {/* Glow púrpura suave detrás de la banda. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#9810FA]/6 via-transparent to-[#c026d3]/6"
      />
      <div className="relative px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span
            aria-hidden
            className={cn(
              "inline-flex size-7 shrink-0 items-center justify-center rounded-full transition-all duration-300",
              hasTickets
                ? "bg-[#9810FA] text-white shadow-[0_6px_18px_-6px_rgba(152,16,250,0.6)]"
                : "bg-[#9810FA]/10 text-[#9810FA]",
            )}
          >
            <Ticket className="size-3.5" strokeWidth={1.4} />
          </span>
          <p className="flex-1 text-[12px] leading-snug text-[#0A0A0A]/80">
            {hasTickets ? (
              <>
                Esta compra acumula{" "}
                <span className="font-semibold text-[#9810FA]">
                  {tickets} ticket{tickets === 1 ? "" : "s"}
                </span>{" "}
                <span className="text-[#0A0A0A]/55">Purpura Club</span>
              </>
            ) : (
              <>
                Te falta{" "}
                <span className="font-semibold tabular-nums text-[#0A0A0A]">
                  {formatCurrency(toNextTicket)}
                </span>{" "}
                <span className="text-[#0A0A0A]/55">
                  para tu primer ticket
                </span>
              </>
            )}
          </p>
        </div>
        <div className="relative mt-2 h-[3px] overflow-hidden rounded-full bg-[#1111110d]">
          <motion.div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#9810FA] to-[#c026d3]"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Empty content (minimal · solo hero + CTA) ────────────────────────────

function EmptyContent({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 py-10">
      <div className="relative flex size-16 items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-[#9810FA]/15 blur-2xl"
        />
        <div className="relative flex size-12 items-center justify-center rounded-full bg-white ring-1 ring-[#9810FA]/18">
          <ShoppingBag
            className="size-5 text-[#9810FA]"
            strokeWidth={1.4}
          />
        </div>
      </div>

      <div className="mt-5 text-center">
        <h3 className="font-serif text-[18px] tracking-tight text-[#0A0A0A]">
          Tu carrito está vacío
        </h3>
        <p className="mx-auto mt-1.5 max-w-60 text-[12px] leading-relaxed text-[#0A0A0A]/55">
          Descubre todo lo que tenemos para ti.
        </p>
      </div>

      <Link
        href="/shop"
        onClick={onClose}
        className="mt-5 block"
      >
        <button
          type="button"
          className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-[#0A0A0A] px-5 text-[11px] font-medium uppercase tracking-[0.14em] text-white transition-all duration-300 hover:bg-[#9810FA] hover:shadow-[0_8px_22px_-10px_rgba(152,16,250,0.55)]"
        >
          Explorar tienda
          <ArrowRight
            className="size-3 transition-transform duration-300 group-hover:translate-x-0.5"
            strokeWidth={1.6}
          />
        </button>
      </Link>
    </div>
  );
}

// ─── Cart row (compacto + premium) ────────────────────────────────────────

function CartLineRow({
  item,
  onQty,
  onRemove,
  onNavigate,
}: {
  item: CartItem;
  onQty: (q: number) => void;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const lineTotal = item.unitPrice * item.quantity;
  return (
    <li className="group relative flex gap-3 py-3">
      <Link
        href={`/product/${item.slug}`}
        onClick={onNavigate}
        className="relative size-14 shrink-0 overflow-hidden rounded-md bg-[#F4F4F5] ring-1 ring-black/4"
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="56px"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#0A0A0A]/30">
            <ImageOff className="size-3.5" strokeWidth={1.4} />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 pr-1">
            {item.category ? (
              <p className="truncate text-[8.5px] font-medium uppercase tracking-[0.22em] text-[#0A0A0A]/45">
                {item.category}
              </p>
            ) : null}
            <Link
              href={`/product/${item.slug}`}
              onClick={onNavigate}
              className="block truncate text-[12.5px] font-medium leading-snug text-[#0A0A0A] transition-colors duration-200 hover:text-[#9810FA]"
            >
              {item.name}
            </Link>
            <p className="mt-0.5 truncate text-[9.5px] text-[#0A0A0A]/40">
              {item.sku}
            </p>
          </div>
          <button
            onClick={onRemove}
            aria-label={`Quitar ${item.name}`}
            className="-mr-0.5 -mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[#0A0A0A]/35 transition-all duration-200 hover:bg-[#11111108] hover:text-[#0A0A0A]/85"
          >
            <X className="size-3" strokeWidth={1.6} />
          </button>
        </div>

        <div className="mt-1.5 flex items-center justify-between gap-2">
          <Stepper
            value={item.quantity}
            min={1}
            max={item.stock}
            onChange={onQty}
          />
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[12.5px] font-semibold tabular-nums text-[#0A0A0A]">
              {formatCurrency(lineTotal)}
            </span>
            {item.quantity > 1 ? (
              <span className="text-[9.5px] tabular-nums text-[#0A0A0A]/45">
                {formatCurrency(item.unitPrice)} c/u
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  const canDec = value > min;
  const canInc = value < max;
  return (
    <div
      className="inline-flex items-center rounded-full border border-[#11111114] bg-white"
      role="group"
      aria-label="Cantidad"
    >
      <button
        type="button"
        onClick={() => onChange(value - 1)}
        disabled={!canDec}
        aria-label="Disminuir cantidad"
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-l-full text-[#0A0A0A] transition-colors duration-150",
          canDec
            ? "hover:bg-[#11111108]"
            : "cursor-not-allowed opacity-30",
        )}
      >
        <Minus className="size-2.5" strokeWidth={2} />
      </button>
      <span className="min-w-[22px] text-center text-[11px] font-semibold tabular-nums text-[#0A0A0A]">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        disabled={!canInc}
        aria-label="Aumentar cantidad"
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-r-full text-[#0A0A0A] transition-colors duration-150",
          canInc
            ? "hover:bg-[#11111108]"
            : "cursor-not-allowed opacity-30",
        )}
      >
        <Plus className="size-2.5" strokeWidth={2} />
      </button>
    </div>
  );
}

// ─── Summary (minimal + luxury) ───────────────────────────────────────────

function Summary({
  breakdown,
  onCheckout,
  onContinue,
}: {
  breakdown: ReturnType<typeof splitGross>;
  onCheckout: () => void;
  onContinue: () => void;
}) {
  return (
    <footer className="sticky bottom-0 border-t border-[#1111110d] bg-white px-5 pb-4 pt-3.5 shadow-[0_-12px_30px_-20px_rgba(17,17,17,0.14)]">
      {/*
        Resumen luxury — sin desglose tributario visible al cliente.
        El cálculo fiscal (IGV) sigue intacto en `breakdown` y se imprime
        en el comprobante final desde backend; el storefront solo muestra
        el monto gross que el cliente paga.
      */}
      <dl className="space-y-1 text-[11.5px]">
        <SummaryRow
          label="Envío"
          value={
            <span className="font-normal text-[#0A0A0A]/45">
              Calculado en checkout
            </span>
          }
        />
      </dl>

      {/* Total prominente — serif, divider fino arriba, sin chips ni bloques. */}
      <div className="mt-2.5 flex items-baseline justify-between border-t border-[#11111114] pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#0A0A0A]/55">
          Total
        </span>
        <span className="font-serif text-[24px] leading-none tracking-tight text-[#0A0A0A] tabular-nums">
          {formatCurrency(breakdown.total)}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        <Button
          variant="primary"
          size="md"
          className="group h-11 w-full text-[11.5px] tracking-[0.14em] uppercase hover:shadow-[0_10px_24px_-12px_rgba(152,16,250,0.5)] hover:-translate-y-px"
          onClick={onCheckout}
        >
          Finalizar compra
          <ArrowRight
            className="size-3.5 transition-transform duration-300 group-hover:translate-x-0.5"
            strokeWidth={1.6}
          />
        </Button>
        <button
          type="button"
          onClick={onContinue}
          className="block w-full py-1 text-center text-[11px] text-[#0A0A0A]/60 transition-colors duration-200 hover:text-[#9810FA]"
        >
          <span className="border-b border-transparent pb-0.5 hover:border-[#9810FA]/50">
            Seguir comprando
          </span>
        </button>
      </div>
    </footer>
  );
}

function SummaryRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-[#0A0A0A]/55">{label}</dt>
      <dd className="font-medium tabular-nums text-[#0A0A0A]">{value}</dd>
    </div>
  );
}
