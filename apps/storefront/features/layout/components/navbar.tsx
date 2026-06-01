"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Crown, Heart, Menu, Search, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/shared/lib/cn";
import { useMediaQuery } from "@/shared/lib/use-media-query";
import { useCategories } from "@/features/catalog/hooks/use-catalog";
import { SearchCommand } from "@/features/search/components/search-command";
import { selectCartCount, useCartStore } from "@/stores/cart.store";
import {
  selectWishlistCount,
  useWishlistStore,
} from "@/stores/wishlist.store";
import { HeaderMembershipBadge } from "./header-membership-badge";
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
  // así nunca queda colgado un sheet móvil en desktop ni viceversa. El
  // mobileOpen también se cierra para liberar el scroll lock del drawer
  // — sin esto, redimensionar a lg+ deja la página bloqueada sin botón
  // visible para cerrar el drawer (`lg:hidden`).
  useEffect(() => {
    setSearchOpen(false);
    if (isLg) setMobileOpen(false);
  }, [isLg]);

  // Scroll lock del body: vive en el `MobileDrawer` (patrón position:
  // fixed + top: -scrollY) — robusto para iOS Safari y restaura posición
  // exacta al cerrar. Tener dos locks compitiendo por `body.style.overflow`
  // provocaba un leak: el cleanup del lock externo capturaba "hidden"
  // (seteado antes por el lock interno) y restauraba a "hidden" tras cerrar,
  // dejando la página bloqueada hasta el siguiente ciclo open/close.

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
      <div className="relative mx-auto flex h-20 max-w-7xl items-center gap-6 px-5 sm:h-24 sm:px-8">
        {/*
          En mobile, cuando searchOpen=true, hamburger + icons se colapsan
          (display:none) para liberar la fila completa al input. Sin fade
          porque a 360px no hay espacio para mantenerlos ocupando layout
          mientras el input crece. El logo centrado también se oculta para
          que el search tome la fila entera. Desktop no se ve afectado:
          hamburger es `lg:hidden` y los icons siempre visibles allí.
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

        {/*
          Logo desktop (lg+) — flujo normal flex con isotipo + logotipo
          horizontal. Layout idéntico al anterior.
        */}
        <Link
          href="/"
          className="hidden shrink-0 items-center gap-3 transition-opacity hover:opacity-90 lg:flex"
          aria-label="Ir al inicio · Purpura Club"
        >
          <Image
            src="/brand/isotipo-nuevo.svg"
            alt=""
            aria-hidden
            width={48}
            height={48}
            className="size-10"
            priority
          />
          <Image
            src="/brand/logotipo-nuevo-1.svg"
            alt="Purpura Club"
            width={240}
            height={90}
            className="h-9 w-auto lg:h-10"
            priority
          />
        </Link>

        {/*
          Logo mobile (<lg) — posicionado absoluto en el eje central del
          header para garantizar centrado matemático REAL (independiente
          del ancho del bloque izq vs der). Solo logotipo horizontal,
          tamaño protagonico (h-9). Se oculta cuando searchOpen para
          ceder la fila al input.
        */}
        <Link
          href="/"
          aria-label="Ir al inicio · Purpura Club"
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transition-opacity hover:opacity-90 lg:hidden",
            searchOpen && !isLg && "hidden",
          )}
        >
          <Image
            src="/brand/logotipo-nuevo-1.svg"
            alt="Purpura Club"
            width={240}
            height={90}
            className="h-11 w-auto"
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

        {/*
          Acciones derecha. En mobile mostramos SOLO Mi cuenta + Carrito —
          el header gana protagonismo para el logotipo central. Search y
          Wishlist se ocultan en mobile (`hidden lg:inline-flex`) y viven
          dentro del drawer mobile como accesos editoriales con icono +
          label. La funcionalidad se reutiliza vía los mismos callbacks
          (openSearch, openWishlist) — no se duplica lógica ni estado.
        */}
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
              "hidden size-10 items-center justify-center rounded-full text-[#0A0A0A] transition-colors hover:bg-[#11111108] lg:inline-flex",
              searchOpen && isLg && "bg-[#9810FA]/10 text-[#9810FA]",
            )}
          >
            <Search className="size-5" strokeWidth={1.4} />
          </button>
          <button
            onClick={openWishlist}
            className="relative hidden size-10 items-center justify-center rounded-full text-[#0A0A0A] transition-colors hover:bg-[#11111108] lg:inline-flex"
            aria-label="Abrir favoritos"
          >
            <Heart className="size-5" strokeWidth={1.4} />
            {wishlistCount > 0 ? (
              <span className="absolute right-0.5 top-0.5 inline-flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-[#0A0A0A] px-1 text-[10px] font-semibold text-white">
                {wishlistCount > 9 ? "9+" : wishlistCount}
              </span>
            ) : null}
          </button>

          <HeaderMembershipBadge />

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
        onSearch={openSearch}
        onWishlist={openWishlist}
        wishlistCount={wishlistCount}
        links={links}
        isActive={isLinkActive}
      />
    </header>
  );
}

interface MobileDrawerProps {
  open: boolean;
  onClose: () => void;
  /** Abre el SearchCommand que vive en el slot mobile del navbar. */
  onSearch: () => void;
  /** Abre el wishlist drawer (Zustand store). */
  onWishlist: () => void;
  wishlistCount: number;
  links: readonly NavLink[];
  isActive: (link: NavLink) => boolean;
}

/**
 * Duración exit del drawer (debe coincidir con `transition` del aside).
 * Usado para esperar a que el drawer salga antes de disparar acciones
 * secundarias (search/wishlist), evitando solapar paneles superpuestos.
 */
const DRAWER_EXIT_MS = 280;

function MobileDrawer({
  open,
  onClose,
  onSearch,
  onWishlist,
  wishlistCount,
  links,
  isActive,
}: MobileDrawerProps) {
  /**
   * SSR-safe portal mount. Renderizamos en `document.body` para escapar
   * del containing block que crea el navbar (`backdrop-filter: blur(...)`
   * cuando `scrolled=true`) — sin esto, el `fixed inset-0` del drawer se
   * resuelve relativo al padding box del header en lugar del viewport,
   * provocando que el drawer "aparezca" desplazado tras hacer scroll.
   *
   * Spec referida: CSS Containing Block — un ancestor con `backdrop-
   * filter !== none` se convierte en containing block de descendientes
   * `position: fixed`. Portal es la cura canónica.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  /**
   * Body scroll lock con preservación de posición. Usamos el patrón
   * `position: fixed + top: -scrollY` porque `overflow: hidden` no
   * impide el rubber-band en iOS Safari. Al cerrar restauramos los
   * estilos originales y disparamos `scrollTo(0, scrollY)` para volver
   * a la posición exacta que tenía el usuario.
   */
  useEffect(() => {
    if (!open) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const original = {
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      body.style.position = original.position;
      body.style.top = original.top;
      body.style.width = original.width;
      body.style.overflow = original.overflow;
      // Restauramos scroll después de quitar `position: fixed`, en el
      // mismo tick — sin esto, body vuelve a top:0 antes de saltar al
      // scrollY guardado y se percibe un flicker.
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  /**
   * Cierra el drawer y dispara la acción secundaria después del exit.
   * El navbar (z-40) queda visualmente detrás del drawer (z-50) mientras
   * éste sale; esperar al fin de la animación evita que el SearchCommand
   * "aparezca" tapado por el drawer en su exit.
   */
  const closeThen = (next: () => void) => () => {
    onClose();
    window.setTimeout(next, DRAWER_EXIT_MS);
  };

  if (!mounted) return null;

  return createPortal(
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
            className="fixed inset-y-0 left-0 z-50 flex h-dvh w-[88%] max-w-sm flex-col bg-white shadow-[0_0_40px_rgba(17,17,17,0.22)] lg:hidden"
          >
            {/*
              Header editorial — más aire arriba/abajo, hairline más fino,
              cierre ghost con opacity baja → fill sutil en hover. La marca
              gana protagonismo gracias al spacing, no al tamaño.
            */}
            <header className="flex items-center justify-between border-b border-[#11111110] px-6 pt-7 pb-6">
              <Link
                href="/"
                onClick={onClose}
                className="flex items-center gap-2.5 transition-opacity hover:opacity-90"
                aria-label="Inicio Purpura Club"
              >
                <Image
                  src="/brand/isotipo-nuevo.svg"
                  alt=""
                  aria-hidden
                  width={36}
                  height={36}
                  className="size-9"
                />
                <Image
                  src="/brand/logotipo-nuevo-1.svg"
                  alt="Purpura Club"
                  width={213}
                  height={80}
                  className="h-8 w-auto"
                />
              </Link>
              <button
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-1 inline-flex size-10 items-center justify-center rounded-full text-[#0A0A0A]/55 transition-colors duration-200 hover:bg-[#11111108] hover:text-[#0A0A0A]"
              >
                <X className="size-5" strokeWidth={1.4} />
              </button>
            </header>

            {/*
              Body editorial — sin background fills, sin rounded pills, sin
              arrows. Cada item es una línea tipográfica con hairline brand
              como indicador activo (Dior / Aesop pattern). El icono `Crown`
              persiste como acento de highlight (Sorteos).
            */}
            <nav
              className="flex-1 overflow-y-auto px-6 py-7"
              aria-label="Menú móvil"
            >
              <p className="pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#0A0A0A]/45">
                Navegación
              </p>
              <ul>
                {links.map((link) => {
                  const active = isActive(link);
                  return (
                    <li key={`${link.href}-${link.label}`}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "group/item flex items-center gap-3 py-3.5 text-[15px] font-medium tracking-tight transition-colors duration-300 ease-out",
                          active
                            ? "text-[#9810FA]"
                            : "text-[#0A0A0A]/85 hover:text-[#9810FA]",
                        )}
                      >
                        {/*
                          Slot izquierdo de ancho fijo (w-4) — alinea el
                          hairline de nav con el icono de atajos. Cero shift
                          de layout al activar/desactivar (opacity-only).
                        */}
                        <span className="inline-flex w-4 shrink-0 justify-center">
                          <span
                            aria-hidden
                            className={cn(
                              "inline-block h-px w-3 bg-[#9810FA] transition-opacity duration-300",
                              active ? "opacity-100" : "opacity-0",
                            )}
                          />
                        </span>
                        {link.highlight ? (
                          <Crown
                            className="size-3.5 shrink-0 text-[#9810FA]"
                            strokeWidth={1.6}
                          />
                        ) : null}
                        <span>{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/*
                Atajos — misma tipografía y rhythm que la nav. El icono
                izquierdo (Search/Heart) ocupa el mismo slot w-4 que el
                hairline de nav, garantizando alineación vertical del label
                entre secciones. Esto integra ambos bloques en una sola
                experiencia editorial unificada (vs. parecer "extra" abajo).
              */}
              <div className="mt-10">
                <p className="pb-4 text-[10px] font-semibold uppercase tracking-[0.32em] text-[#0A0A0A]/45">
                  Atajos
                </p>
                <ul>
                  <li>
                    <button
                      type="button"
                      onClick={closeThen(onSearch)}
                      className="group/item flex w-full items-center gap-3 py-3.5 text-left text-[15px] font-medium tracking-tight text-[#0A0A0A]/85 transition-colors duration-300 ease-out hover:text-[#9810FA]"
                    >
                      <span className="inline-flex w-4 shrink-0 justify-center">
                        <Search
                          className="size-4 text-[#9810FA]"
                          strokeWidth={1.4}
                        />
                      </span>
                      <span className="flex-1">Buscar</span>
                    </button>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={closeThen(onWishlist)}
                      className="group/item flex w-full items-center gap-3 py-3.5 text-left text-[15px] font-medium tracking-tight text-[#0A0A0A]/85 transition-colors duration-300 ease-out hover:text-[#9810FA]"
                    >
                      <span className="inline-flex w-4 shrink-0 justify-center">
                        <Heart
                          className="size-4 text-[#9810FA]"
                          strokeWidth={1.4}
                        />
                      </span>
                      <span className="flex-1">Lista de deseos</span>
                      {wishlistCount > 0 ? (
                        <span
                          className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0A0A0A] px-1.5 text-[10px] font-semibold tabular-nums text-white"
                          aria-label={`${wishlistCount} productos guardados`}
                        >
                          {wishlistCount > 9 ? "9+" : wishlistCount}
                        </span>
                      ) : null}
                    </button>
                  </li>
                </ul>
              </div>
            </nav>

            {/*
              Footer eliminado por completo. Sin tagline promocional, sin
              CTAs, sin banners — el drawer cierra en el ritmo editorial
              propio de las listas, dejando aire abajo (overflow-y-auto del
              nav reserva la altura restante).
            */}
          </motion.aside>
        </>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
