"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Heart, ShoppingBag, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/shared/ui/button";
import { formatCurrency } from "@/shared/lib/format";
import { useCartStore } from "@/stores/cart.store";
import { toast } from "@/stores/toast.store";
import {
  selectWishlistCount,
  useWishlistStore,
  type WishlistItem,
} from "@/stores/wishlist.store";

export function WishlistDrawer() {
  const items = useWishlistStore((s) => s.items);
  const isOpen = useWishlistStore((s) => s.isOpen);
  const close = useWishlistStore((s) => s.closeDrawer);
  const remove = useWishlistStore((s) => s.remove);
  const clear = useWishlistStore((s) => s.clear);
  const count = useWishlistStore(selectWishlistCount);
  const addToCart = useCartStore((s) => s.add);

  const handleMoveToCart = (item: WishlistItem) => {
    if (item.stock <= 0) {
      toast.info(
        "Producto sin stock",
        "Te avisaremos cuando vuelva a estar disponible.",
      );
      return;
    }
    addToCart({
      productId: item.productId,
      slug: item.slug,
      name: item.name,
      sku: item.sku,
      image: item.image,
      unitPrice: item.unitPrice,
      stock: item.stock,
      category: item.category,
    });
    remove(item.productId);
    toast.success(`${item.name} agregado al carrito`);
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
            className="fixed inset-0 z-50 bg-[#0A0A0A]/30 backdrop-blur-sm"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-label="Favoritos"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[400px] flex-col bg-white shadow-[0_0_60px_-12px_rgba(17,17,17,0.22)]"
          >
            <header className="flex items-start justify-between gap-3 border-b border-[#1111110d] px-5 pb-4 pt-5">
              <div className="space-y-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-[#9810FA]">
                  Tus favoritos
                </p>
                <p className="font-serif text-[20px] tracking-tight text-[#0A0A0A]">
                  {items.length === 0
                    ? "0 piezas"
                    : `${count} pieza${count === 1 ? "" : "s"}`}
                </p>
              </div>
              <button
                onClick={close}
                aria-label="Cerrar"
                className="-mr-1.5 -mt-0.5 inline-flex size-8 items-center justify-center rounded-full text-[#0A0A0A]/55 transition-colors duration-200 hover:bg-[#11111108] hover:text-[#0A0A0A]"
              >
                <X className="size-4" strokeWidth={1.4} />
              </button>
            </header>

            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <EmptyFavorites onClose={close} />
              ) : (
                <ul className="space-y-3 px-5 py-4">
                  {items.map((item) => (
                    <WishlistRow
                      key={item.productId}
                      item={item}
                      onRemove={() => remove(item.productId)}
                      onAdd={() => handleMoveToCart(item)}
                      onNavigate={close}
                    />
                  ))}
                </ul>
              )}
            </div>

            {items.length > 0 ? (
              <footer className="space-y-2 border-t border-[#11111114] bg-[#FAFAFA] px-5 py-4">
                <Link href="/shop" onClick={close} className="block">
                  <Button variant="accent" size="md" className="w-full">
                    Seguir explorando
                  </Button>
                </Link>
                <button
                  onClick={clear}
                  className="block w-full text-center text-[11px] uppercase tracking-[0.22em] text-[#0A0A0A]/55 hover:text-[#9810FA]"
                >
                  Vaciar favoritos
                </button>
              </footer>
            ) : null}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

// ─── Empty state (luxury · hero icon + glow + CTA refinado) ───────────────

function EmptyFavorites({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.08 }}
      className="flex h-full flex-col items-center justify-center px-6 py-10"
    >
      <div className="relative flex size-16 items-center justify-center">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-[#9810FA]/12 blur-2xl"
        />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.18 }}
          className="relative flex size-12 items-center justify-center rounded-full bg-white ring-1 ring-[#9810FA]/20 shadow-[0_8px_24px_-14px_rgba(152,16,250,0.45)]"
        >
          <Heart className="size-5 text-[#9810FA]" strokeWidth={1.4} />
        </motion.div>
      </div>

      <div className="mt-5 text-center">
        <h3 className="font-serif text-[18px] tracking-tight text-[#0A0A0A]">
          Tus favoritos aún están vacíos
        </h3>
        <p className="mx-auto mt-2 max-w-65 text-[12px] leading-relaxed text-[#0A0A0A]/55">
          Guarda las piezas que más te gusten y encuéntralas aquí cuando
          quieras.
        </p>
      </div>

      <Link href="/shop" onClick={onClose} className="mt-6 block">
        <button
          type="button"
          className="group inline-flex h-10 items-center gap-1.5 rounded-full bg-[#0A0A0A] px-5 text-[11px] font-medium uppercase tracking-[0.14em] text-white transition-all duration-300 hover:-translate-y-px hover:bg-[#9810FA] hover:shadow-[0_8px_22px_-10px_rgba(152,16,250,0.55)]"
        >
          Explorar la tienda
          <ArrowRight
            className="size-3 transition-transform duration-300 group-hover:translate-x-0.5"
            strokeWidth={1.6}
          />
        </button>
      </Link>
    </motion.div>
  );
}

interface WishlistRowProps {
  item: WishlistItem;
  onRemove: () => void;
  onAdd: () => void;
  onNavigate: () => void;
}

function WishlistRow({ item, onRemove, onAdd, onNavigate }: WishlistRowProps) {
  const outOfStock = item.stock <= 0;
  return (
    <li className="flex gap-3 rounded-xl border border-[#11111111] bg-white p-3">
      <Link
        href={`/product/${item.slug}`}
        onClick={onNavigate}
        className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-[#FAFAFA]"
      >
        {item.image ? (
          <Image
            src={item.image}
            alt={item.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-[#0A0A0A]/30">
            <ShoppingBag className="size-5" />
          </div>
        )}
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {item.category ? (
              <p className="text-[10px] uppercase tracking-[0.2em] text-[#0A0A0A]/45">
                {item.category}
              </p>
            ) : null}
            <Link
              href={`/product/${item.slug}`}
              onClick={onNavigate}
              className="line-clamp-2 text-sm font-medium text-[#0A0A0A] hover:text-[#9810FA]"
            >
              {item.name}
            </Link>
          </div>
          <button
            onClick={onRemove}
            aria-label="Quitar de favoritos"
            className="rounded-full p-1.5 text-[#0A0A0A]/45 hover:bg-[#11111108] hover:text-[#0A0A0A]"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <div>
            <span className="text-sm font-semibold tabular-nums text-[#0A0A0A]">
              {formatCurrency(item.unitPrice)}
            </span>
            {item.compareAtPrice && item.compareAtPrice > item.unitPrice ? (
              <span className="ml-2 text-[11px] text-[#0A0A0A]/40 line-through">
                {formatCurrency(item.compareAtPrice)}
              </span>
            ) : null}
          </div>
          <button
            onClick={onAdd}
            disabled={outOfStock}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#0A0A0A] px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-white transition-colors hover:bg-[#9810FA] disabled:cursor-not-allowed disabled:bg-[#11111118] disabled:text-[#0A0A0A]/45"
          >
            <ShoppingBag className="size-3" />
            {outOfStock ? "Sin stock" : "Al carrito"}
          </button>
        </div>
      </div>
    </li>
  );
}
