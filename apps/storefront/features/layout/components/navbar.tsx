"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/shared/lib/cn";
import { useMediaQuery } from "@/shared/lib/use-media-query";
import { useCategories } from "@/features/catalog/hooks/use-catalog";
import { SearchCommand } from "@/features/search/components/search-command";
import { selectCartCount, useCartStore } from "@/stores/cart.store";
import {
  selectWishlistCount,
  useWishlistStore,
} from "@/stores/wishlist.store";
import { UserMenu } from "./user-menu";

interface NavLink {
  href: string;
  label: string;
  /** Slug crudo de categoría (solo para links dinámicos de shop). */
  categorySlug?: string;
  /** Sorteos se destaca como ecosistema separado. */
  highlight?: boolean;
}

const HOME_LINK: NavLink = { href: "/", label: "Inicio" };
const SORTEOS_LINK: NavLink = {
  href: "/sorteos",
  label: "Sorteos",
  highlight: true,
};

/** Cuántas categorías root reales mostrar en el centro del navbar. */
const NAV_CATEGORY_LIMIT = 2;

export function Navbar() {
  const pathname = usePathname();
  const cartCount = useCartStore(selectCartCount);
  const openCart = useCartStore((s) => s.openDrawer);
  const wishlistCount = useWishlistStore(selectWishlistCount);
  const openWishlist = useWishlistStore((s) => s.openDrawer);
  const { data: categoriesData } = useCategories();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  // SSR-safe: por default asumimos viewport mobile y actualizamos tras
  // mount. Evita mismatch de hidratación cuando se reanima el navbar.
  const isLg = useMediaQuery("(min-width: 1024px)");

  // Lee `?search=` actual desde `window.location.search` (lo mantenemos
  // sincronizado vía el effect de `search` más abajo). Lo derivamos como
  // helper para prefill del input cuando se abre el overlay desde /shop.
  const currentUrlSearch = (() => {
    if (typeof window === "undefined") return "";
    try {
      return new URLSearchParams(search).get("search") ?? "";
    } catch {
      return "";
    }
  })();

  const openSearch = () => {
    // Prefill desde URL si el usuario ya está mirando resultados — así
    // puede refinar la búsqueda en lugar de empezar de cero.
    if (pathname === "/shop" && currentUrlSearch) {
      setSearchQuery(currentUrlSearch);
    } else {
      setSearchQuery("");
    }
    setSearchOpen(true);
  };

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery("");
  };

  // Construimos los links a partir de las categorías reales del admin.
  // Si aún no cargan o no hay ninguna, mostramos solo Inicio + Sorteos.
  const links = useMemo<readonly NavLink[]>(() => {
    const rootCategories = (categoriesData ?? [])
      .filter((c) => !c.parentId && c.active)
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
      .slice(0, NAV_CATEGORY_LIMIT)
      .map<NavLink>((c) => ({
        href: `/shop?category=${encodeURIComponent(c.slug)}`,
        label: c.name,
        categorySlug: c.slug.toLowerCase(),
      }));
    return [HOME_LINK, ...rootCategories, SORTEOS_LINK];
  }, [categoriesData]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setSearch(window.location.search);
    update();
    window.addEventListener("popstate", update);
    return () => window.removeEventListener("popstate", update);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  // Si el viewport cambia mientras el overlay está abierto, lo cerramos —
  // así nunca queda colgado un sheet móvil en desktop ni viceversa.
  useEffect(() => {
    setSearchOpen(false);
  }, [isLg]);

  useEffect(() => {
    if (!mobileOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [mobileOpen]);

  const isLinkActive = (link: NavLink): boolean => {
    if (link.href === "/") return pathname === "/";
    if (link.categorySlug) {
      const pattern = new RegExp(
        `[?&]category=${escapeRegex(link.categorySlug)}\\b`,
        "i",
      );
      return (pathname?.startsWith("/shop") ?? false) && pattern.test(search);
    }
    return pathname?.startsWith(link.href) ?? false;
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-all duration-300",
        scrolled
          ? "border-[#11111114] bg-white/90 shadow-[0_1px_0_rgba(17,17,17,0.04)] backdrop-blur-xl"
          : "border-transparent bg-white",
      )}
    >
      <div className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-5 sm:h-24 sm:px-8">
        {/*
          En mobile, cuando searchOpen=true, hamburger + icons se colapsan
          (display:none) para liberar la fila completa al input. Sin fade
          porque a 360px no hay espacio para mantenerlos ocupando layout
          mientras el input crece. Logo + branding permanecen visibles
          (requisito UX). Desktop no se ve afectado: hamburger ya es
          `lg:hidden` y los icons siempre visibles allí.
        */}
        <button
          onClick={() => setMobileOpen(true)}
          className={cn(
            "-ml-2 rounded-full p-2 text-[#0A0A0A] transition-colors hover:bg-[#11111108] lg:hidden",
            searchOpen && !isLg && "hidden",
          )}
          aria-label="Abrir menú"
        >
          <Menu className="size-5" strokeWidth={1.4} />
        </button>

        <Link
          href="/"
          className="flex shrink-0 items-center gap-3 transition-opacity hover:opacity-90"
          aria-label="Ir al inicio · Purpura Club"
        >
          <Image
            src="/brand/isotipo.svg"
            alt=""
            aria-hidden
            width={48}
            height={48}
            className="size-9 sm:size-10"
            priority
          />
          <Image
            src="/brand/logotipo.svg"
            alt="Purpura Club"
            width={180}
            height={36}
            className="hidden h-7 w-auto sm:block lg:h-8"
            priority
          />
        </Link>

        {/*
          Slot mobile · solo visible cuando searchOpen && !isLg. El input
          fade-in toma el espacio entre logo e (icons ocultos), integrándose
          al navbar sin popup. Sin backdrop, sin sheet, sin modal feel.
        */}
        <div className="flex-1 lg:hidden">
          <SearchCommand
            open={searchOpen && !isLg}
            onClose={closeSearch}
            query={searchQuery}
            onQueryChange={setSearchQuery}
          />
        </div>

        {/*
          Slot central · desktop. Cuando searchOpen=true (en lg+), los nav
          links se desvanecen suavemente y el input toma su lugar con un
          fade limpio (sin scale, sin shift, sin backdrop). Layered con
          absolute para que la transición sea simultánea y elegante.
        */}
        <div className="relative hidden h-full flex-1 items-center justify-center lg:flex">
          <motion.nav
            className="flex items-center gap-2"
            aria-label="Navegación principal"
            animate={{ opacity: searchOpen && isLg ? 0 : 1 }}
            transition={{ duration: 0.16, ease: [0.4, 0, 0.2, 1] }}
            style={{ pointerEvents: searchOpen && isLg ? "none" : "auto" }}
            aria-hidden={searchOpen && isLg}
          >
            {links.map((link) => {
              const active = isLinkActive(link);
              return (
                <Link
                  key={`${link.href}-${link.label}`}
                  href={link.href}
                  tabIndex={searchOpen && isLg ? -1 : 0}
                  className={cn(
                    "relative px-5 py-2.5 text-[13px] font-medium uppercase tracking-[0.18em] transition-colors",
                    active
                      ? "text-[#9810FA]"
                      : "text-[#0A0A0A]/75 hover:text-[#0A0A0A]",
                  )}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {link.highlight ? (
                      <Crown
                        className={cn(
                          "size-3",
                          active ? "text-[#9810FA]" : "text-[#9810FA]/80",
                        )}
                      />
                    ) : null}
                    {link.label}
                  </span>
                  <span
                    aria-hidden
                    className={cn(
                      "absolute inset-x-5 -bottom-1 h-px origin-center bg-[#9810FA] transition-transform duration-300",
                      active ? "scale-x-100" : "scale-x-0",
                    )}
                  />
                </Link>
              );
            })}
          </motion.nav>

          <div
            className={cn(
              "absolute inset-x-0 top-1/2 mx-auto w-full max-w-3xl -translate-y-1/2 px-2",
              searchOpen && isLg ? "pointer-events-auto" : "pointer-events-none",
            )}
          >
            <SearchCommand
              open={searchOpen && isLg}
              onClose={closeSearch}
              query={searchQuery}
              onQueryChange={setSearchQuery}
            />
          </div>
        </div>

        <div
          className={cn(
            "ml-auto items-center gap-1 lg:flex lg:gap-1.5",
            searchOpen && !isLg ? "hidden" : "flex",
          )}
        >
          <button
            type="button"
            onClick={() => (searchOpen ? closeSearch() : openSearch())}
            aria-label={searchOpen ? "Cerrar búsqueda" : "Buscar productos"}
            aria-expanded={searchOpen}
            className={cn(
              "inline-flex size-10 items-center justify-center rounded-full text-[#0A0A0A] transition-colors hover:bg-[#11111108]",
              searchOpen && isLg && "bg-[#9810FA]/10 text-[#9810FA]",
            )}
          >
            <Search className="size-5" strokeWidth={1.4} />
          </button>
          <button
            onClick={openWishlist}
            className="relative inline-flex size-10 items-center justify-center rounded-full text-[#0A0A0A] transition-colors hover:bg-[#11111108]"
            aria-label="Abrir favoritos"
          >
            <Heart className="size-5" strokeWidth={1.4} />
            {wishlistCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#0A0A0A] px-1 text-[10px] font-semibold text-white">
                {wishlistCount > 9 ? "9+" : wishlistCount}
              </span>
            ) : null}
          </button>

          <UserMenu />

          <button
            onClick={openCart}
            className="relative inline-flex size-10 items-center justify-center rounded-full text-[#0A0A0A] transition-colors hover:bg-[#11111108]"
            aria-label="Abrir carrito"
          >
            <ShoppingBag className="size-5" strokeWidth={1.4} />
            {cartCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#9810FA] px-1 text-[10px] font-semibold text-white">
                {cartCount > 9 ? "9+" : cartCount}
              </span>
            ) : null}
          </button>
        </div>
      </div>

      <MobileDrawer
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        links={links}
        isActive={isLinkActive}
      />
    </header>
  );
}

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  links: readonly NavLink[];
  isActive: (link: NavLink) => boolean;
}

function MobileDrawer({ open, onClose, links, isActive }: MobileDrawerProps) {
  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-[#0A0A0A]/35 backdrop-blur-sm lg:hidden"
            aria-hidden
          />
          <motion.aside
            role="dialog"
            aria-label="Menú principal"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-y-0 left-0 z-50 flex w-[88%] max-w-sm flex-col bg-white shadow-[0_0_40px_rgba(17,17,17,0.22)] lg:hidden"
          >
            <header className="flex items-center justify-between border-b border-[#11111114] px-5 py-5">
              <Link
                href="/"
                onClick={onClose}
                className="flex items-center gap-2"
                aria-label="Inicio Purpura Club"
              >
                <Image
                  src="/brand/isotipo.svg"
                  alt=""
                  aria-hidden
                  width={36}
                  height={36}
                  className="size-9"
                />
                <Image
                  src="/brand/logotipo.svg"
                  alt="Purpura Club"
                  width={140}
                  height={28}
                  className="h-6 w-auto"
                />
              </Link>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="rounded-full p-2 text-[#0A0A0A] hover:bg-[#11111108]"
              >
                <X className="size-5" strokeWidth={1.4} />
              </button>
            </header>

            <nav
              className="flex-1 overflow-y-auto px-3 py-4"
              aria-label="Menú móvil"
            >
              <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/45">
                Navegación
              </p>
              <ul className="space-y-1">
                {links.map((link) => {
                  const active = isActive(link);
                  return (
                    <li key={`${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className={cn(
                          "flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-colors",
                          active
                            ? "bg-[#9810FA]/8 text-[#9810FA]"
                            : "text-[#0A0A0A]/85 hover:bg-[#11111108]",
                        )}
                      >
                        <span className="inline-flex items-center gap-2 uppercase tracking-[0.14em]">
                          {link.highlight ? (
                            <Crown className="size-3.5 text-[#9810FA]" />
                          ) : null}
                          {link.label}
                        </span>
                        <span aria-hidden className="text-base">
                          →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 space-y-1">
                <p className="px-3 pb-2 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/45">
                  Atajos
                </p>
                <Link
                  href="/shop"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#0A0A0A]/85 hover:bg-[#11111108]"
                >
                  <Search className="size-4 text-[#9810FA]" strokeWidth={1.4} />
                  Buscar productos
                </Link>
                <Link
                  href="/sorteos"
                  onClick={onClose}
                  className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[#0A0A0A]/85 hover:bg-[#11111108]"
                >
                  <Crown className="size-4 text-[#9810FA]" strokeWidth={1.4} />
                  Sorteos activos
                </Link>
              </div>
            </nav>

            <footer className="border-t border-[#11111114] bg-[#FAFAFA] px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9810FA]">
                Club Púrpura
              </p>
              <p className="mt-0.5 text-xs text-[#0A0A0A]/55">
                Acumula puntos · Gana sorteos · Vive lujo retail.
              </p>
            </footer>
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
