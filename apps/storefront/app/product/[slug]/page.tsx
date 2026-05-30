"use client";

import { use, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Crown,
  Heart,
  ImageOff,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { formatCurrency } from "@/shared/lib/format";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/features/catalog/components/product-card";
import {
  useProductBySlug,
  useProducts,
} from "@/features/catalog/hooks/use-catalog";
import { useCartStore } from "@/stores/cart.store";
import { selectIsFavorite, useWishlistStore } from "@/stores/wishlist.store";
import { toast } from "@/stores/toast.store";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const { slug } = use(params);
  const { data, isLoading, isError } = useProductBySlug(slug);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const add = useCartStore((s) => s.add);
  const toggleFavorite = useWishlistStore((s) => s.toggle);
  const isFavorite = useWishlistStore(selectIsFavorite(data?.id ?? ""));

  // Related products — estrategia en cascada para evitar grilla vacía:
  //   1. Query "deep": última categoría del producto (asumida más específica).
  //   2. Query "root": primera categoría (asumida raíz, si difiere de la deep).
  //   3. Query "all": sin filtro de categoría — último recurso si el producto
  //      es el único en su rama.
  // El backend ya expande descendientes en `/v1/products` público
  // (`expandCategoryDescendants: true` forzado en controller), así que
  // cualquier nivel produce productos del subárbol completo. React Query
  // dedupea queries con mismos params, así que cuando las categorías
  // coinciden o son undefined, no hay request extra.
  const { deepCat, rootCat } = useMemo(() => {
    if (!data) return { deepCat: undefined, rootCat: undefined };
    const list = data.categories;
    return {
      deepCat: list[list.length - 1]?.id,
      rootCat: list[0]?.id,
    };
  }, [data]);
  const sameLevel = deepCat === rootCat;

  const deepQ = useProducts({ limit: 8, sort: "newest", categoryId: deepCat });
  const rootQ = useProducts({
    limit: 8,
    sort: "newest",
    categoryId: sameLevel ? undefined : rootCat,
  });
  const allQ = useProducts({ limit: 8, sort: "newest" });

  if (isLoading) return <ProductSkeleton />;

  if (isError || !data) {
    return (
      <Container className="py-24 text-center">
        <h1 className="font-serif text-3xl text-[#0A0A0A]">
          Producto no disponible
        </h1>
        <p className="mt-2 text-sm text-[#0A0A0A]/55">
          Es posible que se haya retirado del catálogo.
        </p>
        <Link href="/shop" className="mt-6 inline-block">
          <Button>Volver a la tienda</Button>
        </Link>
      </Container>
    );
  }

  const cover = data.images[activeImage]?.url ?? data.images[0]?.url ?? null;
  const totalStock = data.inventory.totalStock;
  const outOfStock = totalStock <= 0;
  const lowStock = !outOfStock && totalStock <= 5;
  const hasDiscount =
    data.discountActive &&
    data.salePrice !== null &&
    data.salePrice < data.price;
  const finalPrice = hasDiscount ? (data.salePrice ?? data.price) : data.price;
  const compareAt = hasDiscount ? data.price : null;

  // NOTA: El desglose visible de IGV (base imponible / IGV) se removió de
  // esta página para alinearla con el look luxury ecommerce. La lógica
  // fiscal sigue 100% intacta en backend (`Order/OrderItem.igvAmount`,
  // `unitPriceUntaxed`, `subtotalUntaxed`, `fiscalSnapshot`, series SUNAT-
  // ready) y se imprime en el comprobante final. El cliente solo ve precio
  // final con IGV incluido por convención retail.

  const handleAdd = () => {
    if (outOfStock) return;
    add(
      {
        productId: data.id,
        slug: data.slug,
        name: data.name,
        sku: data.sku,
        image: cover,
        unitPrice: finalPrice,
        stock: totalStock,
        category: data.categories[0]?.name ?? null,
      },
      quantity,
    );
    toast.success(`${data.name} agregado al carrito`);
  };

  const handleFavorite = () => {
    const wasAdded = toggleFavorite({
      productId: data.id,
      slug: data.slug,
      name: data.name,
      sku: data.sku,
      image: cover,
      unitPrice: finalPrice,
      compareAtPrice: compareAt,
      stock: totalStock,
      category: data.categories[0]?.name ?? null,
    });
    if (wasAdded) toast.success("Guardado en favoritos");
  };

  // Aplico la cascada deep → root → all. El primer nivel con items
  // útiles (después de excluir el producto actual) gana. Si los tres
  // están vacíos, el catálogo realmente solo tiene este producto.
  const excludeCurrent = (items?: typeof deepQ.data) =>
    (items?.items ?? []).filter((p) => p.id !== data.id);

  const deepItems = excludeCurrent(deepQ.data);
  const rootItems = excludeCurrent(rootQ.data);
  const allItems = excludeCurrent(allQ.data);

  const relatedItems = (
    deepItems.length > 0
      ? deepItems
      : rootItems.length > 0
        ? rootItems
        : allItems
  ).slice(0, 4);

  // Loading state: si las tres queries siguen cargando, mostramos
  // skeleton. Si al menos una resolvió (aunque sea vacía), evaluamos
  // relatedItems para decidir entre grid o esconder la sección.
  const relatedLoading =
    deepQ.isLoading && rootQ.isLoading && allQ.isLoading;
  const showRelated = relatedLoading || relatedItems.length > 0;

  return (
    <div className="bg-white pb-20">
      <Container className="pt-6">
        <Link
          href="/shop"
          className="inline-flex items-center gap-1 text-xs text-[#0A0A0A]/55 transition-colors hover:text-[#9810FA]"
        >
          <ChevronLeft className="size-3.5" />
          Volver a la tienda
        </Link>
      </Container>

      {/* ─── HERO: imagen 42% / info 58% (editorial luxury) ──────── */}
      <Container className="mt-6 grid items-start gap-10 lg:mt-10 lg:grid-cols-[5fr_7fr] lg:gap-12 xl:gap-16">
        {/* Galería:
            · Mobile: imagen arriba (orden 1), thumbs grid horizontal abajo.
            · Desktop (lg+): thumbs columna vertical a la izquierda, main
              image flex-1 a la derecha (estilo Farfetch). Order swap se
              hace con `order-` per breakpoint para no duplicar markup.
            · aspect-square (1:1) en vez de 4/5 → menos alto vertical,
              más editorial luxury, menos scroll.
            · lg:sticky lg:top-24 → la galería queda fija al scrollear la
              info, estilo Net-a-Porter / Mr Porter. */}
        <div className="mx-auto flex w-full max-w-md flex-col gap-3 lg:sticky lg:top-24 lg:mx-0 lg:max-w-md lg:flex-row lg:gap-4">
          {data.images.length > 1 ? (
            <div className="order-2 grid grid-cols-5 gap-2 lg:order-1 lg:flex lg:w-16 lg:shrink-0 lg:flex-col lg:gap-2">
              {data.images.slice(0, 5).map((img, i) => (
                <ThumbButton
                  key={img.id}
                  url={img.url}
                  alt={`${data.name} ${i + 1}`}
                  active={i === activeImage}
                  onClick={() => setActiveImage(i)}
                />
              ))}
            </div>
          ) : null}

          <div className="order-1 min-w-0 flex-1 lg:order-2">
            <div
              className={cn(
                "relative overflow-hidden rounded-2xl bg-surface-muted ring-1 ring-black/4",
                cover ? "aspect-square" : "h-64 sm:h-72",
              )}
            >
              {cover ? (
                <MainImage key={cover} src={cover} alt={data.name} />
              ) : (
                <FallbackImage hadUrl={false} />
              )}

              {/* Out-of-stock overlay sobre la imagen principal */}
              {outOfStock ? (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[1px]">
                  <span className="rounded-full bg-[#0A0A0A]/90 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">
                    Agotado
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="space-y-6 lg:pt-2">
          {/* Breadcrumb kicker (categorías reales del producto) */}
          {data.categories.length > 0 ? (
            <nav
              aria-label="Categorías del producto"
              className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] font-medium uppercase tracking-[0.22em] text-[#0A0A0A]/55"
            >
              <Link
                href="/shop"
                className="transition-colors hover:text-[#9810FA]"
              >
                Tienda
              </Link>
              {data.categories.map((c) => (
                <span key={c.id} className="flex items-center gap-x-1.5">
                  <ChevronRight className="size-3 text-[#0A0A0A]/30" />
                  <Link
                    href={`/shop?category=${c.slug}`}
                    className="transition-colors hover:text-[#9810FA]"
                  >
                    {c.name}
                  </Link>
                </span>
              ))}
            </nav>
          ) : null}

          <h1 className="font-serif text-3xl tracking-tight text-balance text-[#0A0A0A] sm:text-[40px] sm:leading-[1.05]">
            {data.name}
          </h1>

          {/* Badges de estado (solo discount + low stock).
              "Destacado / Premium" se movió a la sección Detalles abajo
              como característica del producto, no como state indicator. */}
          {hasDiscount || lowStock ? (
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-[0.18em]">
              {hasDiscount ? (
                <span className="inline-flex items-center rounded-full bg-[#0A0A0A] px-2.5 py-1 font-semibold text-white tabular-nums">
                  −{Math.round(data.discountPercentage ?? 0)}%
                </span>
              ) : null}
              {lowStock ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[#0A0A0A]/70 ring-1 ring-black/10">
                  <span className="inline-block size-1.5 rounded-full bg-amber-500" />
                  Últimas {totalStock}
                </span>
              ) : null}
            </div>
          ) : null}

          {/* Precio limpio (sin desglose IGV) */}
          <div className="space-y-2">
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-semibold tabular-nums tracking-tight text-[#0A0A0A]">
                {formatCurrency(finalPrice)}
              </span>
              {compareAt ? (
                <span className="text-base text-[#0A0A0A]/40 line-through tabular-nums">
                  {formatCurrency(compareAt)}
                </span>
              ) : null}
            </div>
            {data.memberPrice && data.memberPrice < finalPrice ? (
              <p className="inline-flex items-center gap-1.5 text-xs text-[#9810FA]">
                <Crown className="size-3.5" strokeWidth={1.6} />
                <span>
                  Precio miembro Club:{" "}
                  <strong className="font-semibold tabular-nums">
                    {formatCurrency(data.memberPrice)}
                  </strong>
                </span>
              </p>
            ) : null}
          </div>

          {data.description ? (
            <p className="text-[15px] leading-relaxed text-[#0A0A0A]/70">
              {data.description}
            </p>
          ) : null}

          {/* Detalles — chips editorial outlined.
              Cada chip: nombre tenue + valor protagonista, con barra
              vertical fina como separador (más luxury que un punto).
              "Premium" se renderiza como pill negro sólido al final
              cuando `featured`, para que contraste con el resto outlined. */}
          {data.variants.length > 0 || data.featured ? (
            <div className="space-y-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#0A0A0A]/45">
                Detalles
              </p>
              <div className="flex flex-wrap gap-1.5">
                {data.variants.map((v) => (
                  <span
                    key={v.id}
                    className="inline-flex items-center gap-2 rounded-full border border-black/8 bg-white px-3.5 py-1.75 text-[10px] font-medium uppercase tracking-[0.22em] transition-colors duration-300 hover:border-black/20"
                  >
                    <span className="text-[#0A0A0A]/45">{v.name}</span>
                    <span
                      aria-hidden
                      className="inline-block h-2.5 w-px bg-[#0A0A0A]/15"
                    />
                    <span className="font-semibold text-[#0A0A0A]">
                      {v.value}
                    </span>
                  </span>
                ))}
                {data.featured ? (
                  <span className="inline-flex items-center rounded-full bg-[#0A0A0A] px-3.5 py-1.75 text-[10px] font-semibold uppercase tracking-[0.24em] text-white">
                    Premium
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* CTA area — luxury minimal.
              · h-10 alinea quantity, ATC y wishlist (40px no agresivos).
              · ATC: hover bg → púrpura + soft shadow brand-tinted +
                micro lift `-translate-y-px` con ease-out 300ms.
              · Quantity: botones size-10 con icono finito. */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <div className="inline-flex h-10 items-center rounded-full border border-black/10 bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1 || outOfStock}
                className="flex size-10 items-center justify-center text-[#0A0A0A]/65 transition-colors hover:text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Disminuir cantidad"
              >
                <Minus className="size-3.5" strokeWidth={1.6} />
              </button>
              <span className="min-w-7 text-center text-sm font-medium tabular-nums">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) => Math.min(q + 1, totalStock || 999))
                }
                disabled={quantity >= totalStock || outOfStock}
                className="flex size-10 items-center justify-center text-[#0A0A0A]/65 transition-colors hover:text-[#0A0A0A] disabled:cursor-not-allowed disabled:opacity-30"
                aria-label="Aumentar cantidad"
              >
                <Plus className="size-3.5" strokeWidth={1.6} />
              </button>
            </div>

            <button
              type="button"
              onClick={handleAdd}
              disabled={outOfStock}
              className={cn(
                "group/cta inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium transition-all duration-300 ease-out sm:flex-initial sm:px-6",
                outOfStock
                  ? "cursor-not-allowed bg-[#11111108] text-[#0A0A0A]/40"
                  : "bg-[#0A0A0A] text-white hover:-translate-y-px hover:bg-[#9810FA] hover:shadow-[0_12px_28px_-12px_rgba(152,16,250,0.45)] active:translate-y-0",
              )}
            >
              <ShoppingBag
                className="size-3.5 transition-transform duration-300 group-hover/cta:rotate-[-8deg]"
                strokeWidth={1.6}
              />
              {outOfStock ? "Agotado" : "Agregar al carrito"}
            </button>

            <button
              type="button"
              onClick={handleFavorite}
              aria-label={
                isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"
              }
              aria-pressed={isFavorite}
              className={cn(
                "inline-flex size-10 items-center justify-center rounded-full transition-all duration-300 active:scale-95",
                isFavorite
                  ? "bg-[#9810FA] text-white shadow-[0_8px_20px_-8px_rgba(152,16,250,0.55)]"
                  : "bg-white text-[#0A0A0A]/80 ring-1 ring-black/10 hover:text-[#0A0A0A] hover:ring-black/20",
              )}
            >
              <Heart
                className={cn("size-3.5", isFavorite && "fill-current")}
                strokeWidth={1.6}
              />
            </button>
          </div>

          {/* Benefits — fila inline editorial. En mobile wrap natural;
              en desktop quedan en una sola línea cuando hay espacio. */}
          <ul className="flex flex-wrap items-center gap-x-5 gap-y-2.5 border-t border-black/5 pt-6 text-[11px] text-[#0A0A0A]/55">
            <Benefit icon={Truck} label="Envíos a todo el Perú" />
            <Benefit icon={ShieldCheck} label="Garantía Purpura Club" />
            <Benefit icon={Sparkles} label="Puntos del club" />
            <Benefit icon={Crown} label="Sorteos exclusivos" />
          </ul>
        </div>
      </Container>

      {/* ─── Related products ────────────────────────────────────── */}
      {showRelated ? (
        <section className="mt-24 border-t border-black/5 pt-16 sm:mt-28 sm:pt-20">
          <Container>
            <header className="mb-10 flex items-end justify-between gap-3">
              <div className="space-y-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#9810FA]">
                  También te puede gustar
                </p>
                <h2 className="font-serif text-2xl tracking-tight text-[#0A0A0A] sm:text-3xl">
                  Productos relacionados
                </h2>
              </div>
              {data.categories[0] ? (
                <Link
                  href={`/shop?category=${data.categories[0].slug}`}
                  className="hidden text-[11px] font-medium uppercase tracking-[0.18em] text-[#0A0A0A]/55 transition-colors hover:text-[#9810FA] sm:inline-flex sm:items-center sm:gap-1"
                >
                  Ver más
                  <ChevronRight className="size-3.5" />
                </Link>
              ) : null}
            </header>

            {relatedLoading ? (
              <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                  <ProductCardSkeleton key={i} size="sm" />
                ))}
              </div>
            ) : (
              <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 hide-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4 lg:gap-6">
                {relatedItems.map((p) => (
                  <div
                    key={p.id}
                    className="w-42 shrink-0 snap-start sm:w-auto sm:shrink"
                  >
                    <ProductCard
                      product={p}
                      size="sm"
                      imageSizes="(min-width: 1280px) 18vw, (min-width: 1024px) 22vw, 45vw"
                    />
                  </div>
                ))}
              </div>
            )}
          </Container>
        </section>
      ) : null}
    </div>
  );
}

// ─── Components ──────────────────────────────────────────────────────

function MainImage({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false);
  if (error) return <FallbackImage hadUrl />;
  return (
    <Image
      src={src}
      alt={alt}
      fill
      sizes="(min-width: 1024px) 50vw, 100vw"
      priority
      onError={() => setError(true)}
      className="object-cover"
    />
  );
}

function ThumbButton({
  url,
  alt,
  active,
  onClick,
}: {
  url: string;
  alt: string;
  active: boolean;
  onClick: () => void;
}) {
  const [error, setError] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={alt}
      aria-pressed={active}
      className={cn(
        "relative aspect-square overflow-hidden rounded-lg bg-[#f8f8f8] transition-all duration-200",
        active
          ? "ring-2 ring-[#9810FA]"
          : "ring-1 ring-black/6 hover:ring-black/15",
      )}
    >
      {!error ? (
        <Image
          src={url}
          alt={alt}
          fill
          sizes="96px"
          onError={() => setError(true)}
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-[#0A0A0A]/25">
          <ImageOff className="size-4" strokeWidth={1.4} />
        </div>
      )}
    </button>
  );
}

/**
 * Placeholder premium para imagen ausente o rota.
 *  · `hadUrl=false` (producto sin foto subida aún): muestra el isotipo
 *    Púrpura como watermark muy tenue + microcopy "Próximamente". Da
 *    sensación de "producto premium aún sin fotografía", no de error.
 *  · `hadUrl=true` (URL existía pero falló la carga): muestra ícono
 *    `ImageOff` + "Sin imagen". Es un estado de error real.
 * Fondo: gradiente radial brand sutil + gradiente diagonal gris para textura.
 */
function FallbackImage({ hadUrl }: { hadUrl: boolean }) {
  return (
    <div
      aria-hidden
      className="absolute inset-0 flex flex-col items-center justify-center"
      style={{
        background: `
          radial-gradient(circle at 30% 25%, rgba(152, 16, 250, 0.05) 0%, transparent 55%),
          radial-gradient(circle at 80% 90%, rgba(152, 16, 250, 0.03) 0%, transparent 50%),
          linear-gradient(135deg, #fafafa 0%, #f4f4f5 100%)
        `,
      }}
    >
      {hadUrl ? (
        <div className="flex flex-col items-center gap-2 text-[#0A0A0A]/25">
          <ImageOff className="size-7" strokeWidth={1.4} />
          <span className="text-[9px] font-medium uppercase tracking-[0.22em] text-[#0A0A0A]/30">
            Sin imagen
          </span>
        </div>
      ) : (
        <PurpuraWatermark />
      )}
    </div>
  );
}

/**
 * Isotipo `:P` inline (en lugar de cargar `/brand/isotipo-nuevo.svg`) para tener
 * control total de color y opacidad y no depender de Google Fonts. Usa
 * `var(--font-geist-sans)` que es la tipografía del proyecto.
 */
function PurpuraWatermark() {
  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="0 0 400 400"
        className="size-32 text-[#9810FA] opacity-[0.09] sm:size-40"
        aria-hidden
      >
        <text
          x="200"
          y="200"
          fontSize="200"
          fontWeight="500"
          fill="currentColor"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="var(--font-geist-sans), system-ui, sans-serif"
        >
          :P
        </text>
      </svg>
      <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-[#0A0A0A]/25">
        Próximamente
      </span>
    </div>
  );
}

function Benefit({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
}) {
  return (
    <li className="flex items-center gap-2">
      <Icon className="size-3.5 shrink-0 text-[#0A0A0A]/35" strokeWidth={1.5} />
      <span>{label}</span>
    </li>
  );
}

function ProductSkeleton() {
  return (
    <div className="bg-white pb-20">
      <Container className="pt-6">
        <Skeleton className="h-3 w-32" />
      </Container>
      <Container className="mt-6 grid gap-10 lg:mt-10 lg:grid-cols-[5fr_7fr] lg:gap-12 xl:gap-16">
        <div className="mx-auto w-full max-w-md lg:mx-0 lg:max-w-110">
          <Skeleton className="aspect-4/5 w-full rounded-2xl" />
        </div>
        <div className="space-y-5 lg:pt-2">
          <Skeleton className="h-3 w-1/4" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-9 w-1/3" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </Container>
    </div>
  );
}
