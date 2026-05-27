"use client";

import { Suspense, useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Filter, ShoppingBag, SlidersHorizontal } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { EmptyState } from "@/shared/ui/empty-state";
import { cn } from "@/shared/lib/cn";
import {
  buildCategoryTree,
  findCategoryBranchById,
  findCategoryBySlugDeep,
  type CategoryNode,
} from "@/shared/lib/categories";
import {
  DEFAULT_PRODUCT_SORT_KEY,
  PRODUCT_SORT_OPTIONS,
  normalizeProductSortKey,
} from "@/shared/lib/product-sort";
import {
  ProductCard,
  ProductCardSkeleton,
} from "@/features/catalog/components/product-card";
import {
  useCategories,
  useProducts,
} from "@/features/catalog/hooks/use-catalog";

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopContent />
    </Suspense>
  );
}

function ShopContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL = single source of truth para todos los filtros.
  // El `search` se lee aquí solo para mostrar contexto y pasarlo al backend —
  // el único editor de `search` vive en el header (SearchCommand). Mantener
  // un input acá duplicaba estado y rompía la experiencia.
  const categorySlug = searchParams.get("category") ?? undefined;
  const subSlug = searchParams.get("sub") ?? undefined;
  const leafSlug = searchParams.get("leaf") ?? undefined;
  // Shortcut amigable: `?subcategory=joyas-acero-dorado` (o `?subcat=...`)
  // viene desde links externos (home showcase, banners, emails) y se resuelve
  // al nodo más profundo cuyo slug coincida en cualquier nivel del árbol.
  // Si la URL ya tiene `category`/`sub`/`leaf`, el shortcut se ignora.
  const subcategoryShortcut =
    searchParams.get("subcategory") ?? searchParams.get("subcat") ?? undefined;
  const searchUrl = searchParams.get("search") ?? "";
  const sort = normalizeProductSortKey(searchParams.get("sort"));
  const pageParam = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(pageParam) && pageParam >= 1 ? pageParam : 1;

  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: catData } = useCategories();
  const tree = useMemo(() => buildCategoryTree(catData ?? []), [catData]);

  const { activeRoot, activeSub, activeLeaf, mostSpecific } = useMemo(
    () =>
      resolveActivePath(
        tree,
        categorySlug,
        subSlug,
        leafSlug,
        subcategoryShortcut,
      ),
    [tree, categorySlug, subSlug, leafSlug, subcategoryShortcut],
  );

  const effectiveCategoryId = mostSpecific?.id;

  const { data, isLoading, isFetching } = useProducts({
    page,
    limit: 24,
    search: searchUrl.trim() || undefined,
    categoryId: effectiveCategoryId,
    sort,
  });

  const items = data?.items ?? [];
  const totalPages = data?.meta.totalPages ?? 1;
  const totalResults = data?.meta.total ?? items.length;

  const updateParams = useCallback(
    (
      changes: Record<string, string | null | undefined>,
      options: { history?: "push" | "replace" } = {},
    ) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === undefined || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      const qs = next.toString();
      const url = qs ? `${pathname}?${qs}` : pathname;
      const navigate = options.history === "replace" ? router.replace : router.push;
      navigate(url, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const handleSelectRoot = (root: CategoryNode | null) => {
    setFiltersOpen(false);
    updateParams({
      category: root?.slug ?? null,
      sub: null,
      leaf: null,
      page: null,
    });
  };

  const handleSelectSub = (sub: CategoryNode | null) => {
    updateParams({
      sub: sub?.slug ?? null,
      leaf: null,
      page: null,
    });
  };

  const handleSelectLeaf = (leaf: CategoryNode | null) => {
    updateParams({ leaf: leaf?.slug ?? null, page: null });
  };

  const handleSelectSort = (raw: string) => {
    const next = normalizeProductSortKey(raw);
    updateParams({
      sort: next === DEFAULT_PRODUCT_SORT_KEY ? null : next,
      page: null,
    });
  };

  const handleSelectPage = (next: number) => {
    const clamped = Math.max(1, Math.min(totalPages, next));
    updateParams({ page: clamped === 1 ? null : String(clamped) });
  };

  const handleClearAll = () => {
    setFiltersOpen(false);
    updateParams({
      category: null,
      sub: null,
      leaf: null,
      search: null,
      page: null,
    });
  };

  const breadcrumb = mostSpecific
    ? findCategoryBranchById(tree, mostSpecific.id)
    : [];
  const ancestors = breadcrumb.slice(0, -1);

  const hasAnyFilter = Boolean(mostSpecific) || searchUrl.length > 0;
  const showCount = !isLoading && data !== undefined;

  return (
    <div className="bg-white pb-16">
      {/* ─── HERO contextual ─────────────────────────────────────────── */}
      <section className="lux-aurora border-b border-[#11111108]">
        <Container className="py-10 sm:py-14">
          {ancestors.length > 0 ? (
            <nav
              aria-label="Migas de pan"
              className="mb-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] uppercase tracking-[0.22em] text-[#0A0A0A]/50"
            >
              <button
                onClick={() => handleSelectRoot(null)}
                className="transition-colors hover:text-[#9810FA]"
              >
                Tienda
              </button>
              {ancestors.map((node, idx) => (
                <span key={node.id} className="flex items-center gap-x-1.5">
                  <ChevronRight className="size-3 text-[#0A0A0A]/30" />
                  <button
                    onClick={() => {
                      if (idx === 0) handleSelectRoot(node);
                      else if (idx === 1) handleSelectSub(node);
                    }}
                    className="transition-colors hover:text-[#9810FA]"
                  >
                    {node.name}
                  </button>
                </span>
              ))}
            </nav>
          ) : (
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9810FA]">
              Tienda
            </p>
          )}

          <h1 className="animate-fade-up font-serif text-4xl tracking-tight text-[#0A0A0A] sm:text-5xl">
            {mostSpecific?.name ?? "Todos los Productos"}
          </h1>

          {showCount ? (
            <p className="mt-2 text-sm text-[#0A0A0A]/55">
              {totalResults === 0
                ? "Sin productos por ahora"
                : totalResults === 1
                  ? "1 producto"
                  : `${totalResults} productos`}
              {searchUrl ? (
                <>
                  {" · "}
                  <span>
                    para{" "}
                    <span className="text-[#0A0A0A]/75">«{searchUrl}»</span>
                  </span>
                </>
              ) : null}
            </p>
          ) : null}
        </Container>
      </section>

      {/* ─── TOOLBAR sticky: sort + filter mobile + chips de subcategoría ─── */}
      {/* Sin input de búsqueda — el único editor de `?search=` vive en el
          header (SearchCommand). Mantener dos inputs duplicaba estado,
          debounce, handlers y rompía el flujo luxury Apple/Zara. */}
      <section className="sticky top-0 z-30 border-b border-[#11111108] bg-white/80 backdrop-blur-md">
        <Container className="py-3 sm:py-4">
          <div className="flex items-center justify-end gap-2">
            <select
              value={sort}
              onChange={(e) => handleSelectSort(e.target.value)}
              className="h-10 w-full max-w-55 rounded-lg border border-[#11111118] bg-white px-3 text-sm text-[#0A0A0A] transition-colors focus:border-[#9810FA] focus:outline-none focus:ring-2 focus:ring-[#9810FA]/15"
              aria-label="Ordenar"
            >
              {PRODUCT_SORT_OPTIONS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
            <Button
              variant="outline"
              size="md"
              className="h-10 lg:hidden"
              onClick={() => setFiltersOpen((o) => !o)}
              aria-expanded={filtersOpen}
              aria-controls="shop-filters"
            >
              <Filter className="size-4" />
            </Button>
          </div>

          {/* Sub chips (depth 1) — solo si hay root activo */}
          {activeRoot && activeRoot.children.length > 0 ? (
            <div className="mt-3 -mx-4 flex gap-2 overflow-x-auto px-4 hide-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
              <CategoryPill
                active={!activeSub}
                onClick={() => handleSelectSub(null)}
                tone="dark"
              >
                Todo {activeRoot.name}
              </CategoryPill>
              {activeRoot.children.map((sub) => (
                <CategoryPill
                  key={sub.id}
                  active={activeSub?.id === sub.id}
                  onClick={() => handleSelectSub(sub)}
                  tone="brand"
                >
                  {sub.name}
                </CategoryPill>
              ))}
            </div>
          ) : null}

          {/* Leaf chips (depth 2) — solo si hay sub activo con hijos */}
          {activeSub && activeSub.children.length > 0 ? (
            <div className="mt-2 -mx-4 flex gap-1.5 overflow-x-auto px-4 hide-scrollbar sm:mx-0 sm:flex-wrap sm:px-0">
              <CategoryPill
                active={!activeLeaf}
                onClick={() => handleSelectLeaf(null)}
                tone="dark"
                size="sm"
              >
                Todo {activeSub.name}
              </CategoryPill>
              {activeSub.children.map((leaf) => (
                <CategoryPill
                  key={leaf.id}
                  active={activeLeaf?.id === leaf.id}
                  onClick={() => handleSelectLeaf(leaf)}
                  tone="brand"
                  size="sm"
                >
                  {leaf.name}
                </CategoryPill>
              ))}
            </div>
          ) : null}
        </Container>
      </section>

      {/* ─── MAIN: sidebar + grid ────────────────────────────────────── */}
      <Container className="grid gap-6 py-6 sm:py-8 lg:grid-cols-[240px_1fr] lg:gap-10 lg:py-10">
        <aside
          id="shop-filters"
          className={cn(
            "lg:block",
            filtersOpen ? "block animate-fade-up" : "hidden",
          )}
        >
          <ContextualSidebar
            tree={tree}
            activeRoot={activeRoot}
            activeSub={activeSub}
            activeLeaf={activeLeaf}
            onSelectRoot={handleSelectRoot}
            onSelectSub={handleSelectSub}
            onSelectLeaf={handleSelectLeaf}
            onClearAll={handleClearAll}
            hasAnyFilter={hasAnyFilter}
          />
        </aside>

        <main>
          <div className="mb-4 flex items-center justify-between text-xs text-[#0A0A0A]/55">
            <span className="inline-flex items-center gap-1.5">
              <SlidersHorizontal className="size-3.5" />
              {isFetching && !isLoading
                ? "Actualizando…"
                : isLoading
                  ? "Cargando…"
                  : `${totalResults} resultado${totalResults === 1 ? "" : "s"}`}
            </span>
            {hasAnyFilter ? (
              <button
                onClick={handleClearAll}
                className="text-[11px] font-medium text-[#9810FA] transition-colors hover:underline"
              >
                Limpiar filtros
              </button>
            ) : null}
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title={
                hasAnyFilter
                  ? "No encontramos productos para esta selección"
                  : "Catálogo en construcción"
              }
              description={
                hasAnyFilter
                  ? "Probá con otra combinación de categoría, búsqueda u ordenamiento."
                  : "Pronto sumaremos piezas disponibles para ecommerce. Mientras tanto, descubre nuestras tiendas físicas."
              }
              action={
                hasAnyFilter ? (
                  <Button variant="outline" onClick={handleClearAll}>
                    Limpiar filtros
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4 lg:gap-6">
                {items.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              {totalPages > 1 ? (
                <nav
                  aria-label="Paginación"
                  className="mt-12 flex items-center justify-center gap-3"
                >
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => handleSelectPage(page - 1)}
                  >
                    <ChevronLeft className="size-3.5" />
                    Anterior
                  </Button>
                  <span className="text-[11px] uppercase tracking-[0.18em] text-[#0A0A0A]/55 tabular-nums">
                    {page} <span className="text-[#0A0A0A]/35">de</span> {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => handleSelectPage(page + 1)}
                  >
                    Siguiente
                    <ChevronRight className="size-3.5" />
                  </Button>
                </nav>
              ) : null}
            </>
          )}
        </main>
      </Container>
    </div>
  );
}

// ─── Sidebar contextual jerárquico ──────────────────────────────────
// State A — sin activeRoot: lista plana de roots.
// State B — con activeRoot: header "← Todas" + nombre del root + árbol
//   recursivo de subs. El sub activo se auto-expande mostrando sus leafs
//   indentados con border-l. Solo un sub puede estar expandido a la vez
//   (el que esté en el path activo) — evita listas planas largas y
//   refuerza la sensación de drill-down editorial.

interface ContextualSidebarProps {
  tree: CategoryNode[];
  activeRoot: CategoryNode | null;
  activeSub: CategoryNode | null;
  activeLeaf: CategoryNode | null;
  onSelectRoot: (root: CategoryNode | null) => void;
  onSelectSub: (sub: CategoryNode | null) => void;
  onSelectLeaf: (leaf: CategoryNode | null) => void;
  onClearAll: () => void;
  hasAnyFilter: boolean;
}

function ContextualSidebar({
  tree,
  activeRoot,
  activeSub,
  activeLeaf,
  onSelectRoot,
  onSelectSub,
  onSelectLeaf,
  onClearAll,
  hasAnyFilter,
}: ContextualSidebarProps) {
  if (activeRoot) {
    return (
      <div className="lux-card rounded-2xl p-5">
        <button
          onClick={() => onSelectRoot(null)}
          className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55 transition-colors hover:text-[#9810FA]"
        >
          <ChevronLeft className="size-3" />
          Todas las categorías
        </button>
        <h2 className="mt-3 font-serif text-lg tracking-tight text-[#0A0A0A]">
          {activeRoot.name}
        </h2>
        <div className="mt-4 space-y-0.5">
          <SidebarRow
            label={`Todo ${activeRoot.name}`}
            active={!activeSub && !activeLeaf}
            onClick={() => onSelectSub(null)}
          />
          {activeRoot.children.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[#0A0A0A]/40">
              Sin subcategorías por ahora.
            </p>
          ) : (
            activeRoot.children.map((sub) => (
              <SubBranch
                key={sub.id}
                sub={sub}
                activeSubId={activeSub?.id ?? null}
                activeLeafId={activeLeaf?.id ?? null}
                onSelectSub={onSelectSub}
                onSelectLeaf={onSelectLeaf}
              />
            ))
          )}
        </div>
        {hasAnyFilter ? (
          <button
            onClick={onClearAll}
            className="mt-5 w-full rounded-lg border border-[#11111118] py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#0A0A0A]/65 transition-colors hover:border-[#9810FA] hover:text-[#9810FA]"
          >
            Limpiar todo
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="lux-card rounded-2xl p-5">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
        Categorías
      </h2>
      <div className="mt-3 space-y-1">
        {tree.length === 0 ? (
          <p className="px-3 py-2 text-xs text-[#0A0A0A]/40">
            Sin categorías publicadas.
          </p>
        ) : (
          tree.map((root) => (
            <SidebarRow
              key={root.id}
              label={root.name}
              active={false}
              onClick={() => onSelectRoot(root)}
              hint={root.childrenCount > 0 ? `${root.childrenCount}` : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Rama de subcategoría. Renderiza la fila del sub + (si está en el path
 * activo) sus leafs indentados con border-l y animación de fade-up.
 * Solo se expande la rama del activeSub para no llenar la sidebar con
 * todos los hijos de todas las subs simultáneamente.
 */
function SubBranch({
  sub,
  activeSubId,
  activeLeafId,
  onSelectSub,
  onSelectLeaf,
}: {
  sub: CategoryNode;
  activeSubId: string | null;
  activeLeafId: string | null;
  onSelectSub: (sub: CategoryNode | null) => void;
  onSelectLeaf: (leaf: CategoryNode | null) => void;
}) {
  const isExpanded = activeSubId === sub.id;
  const isSelfSelected = isExpanded && !activeLeafId;
  const hasChildren = sub.children.length > 0;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelectSub(sub)}
        aria-expanded={hasChildren ? isExpanded : undefined}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
          isSelfSelected
            ? "bg-[#9810FA]/8 font-medium text-[#9810FA]"
            : isExpanded
              ? "font-medium text-[#9810FA] hover:bg-[#11111108]"
              : "text-[#0A0A0A]/75 hover:bg-[#11111108] hover:text-[#0A0A0A]",
        )}
      >
        <span className="truncate">{sub.name}</span>
        {hasChildren ? (
          <ChevronRight
            className={cn(
              "size-3.5 shrink-0 opacity-50 transition-transform duration-200",
              isExpanded && "rotate-90 opacity-100",
            )}
            aria-hidden
          />
        ) : null}
      </button>

      {isExpanded && hasChildren ? (
        <div className="ml-3 mt-0.5 animate-fade-up space-y-0.5 border-l border-[#11111114] pl-2">
          <SidebarLeafRow
            label={`Todo ${sub.name}`}
            active={!activeLeafId}
            onClick={() => onSelectLeaf(null)}
          />
          {sub.children.map((leaf) => (
            <SidebarLeafRow
              key={leaf.id}
              label={leaf.name}
              active={activeLeafId === leaf.id}
              onClick={() => onSelectLeaf(leaf)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SidebarRow({
  label,
  active,
  onClick,
  hint,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  hint?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
        active
          ? "bg-[#9810FA]/8 font-medium text-[#9810FA]"
          : "text-[#0A0A0A]/75 hover:bg-[#11111108] hover:text-[#0A0A0A]",
      )}
    >
      <span className="truncate">{label}</span>
      {hint ? (
        <span
          className={cn(
            "shrink-0 text-[10px] tabular-nums",
            active ? "text-[#9810FA]/65" : "text-[#0A0A0A]/35",
          )}
        >
          {hint}
        </span>
      ) : null}
    </button>
  );
}

/**
 * Fila de leaf — visualmente más sutil que el sub que la contiene
 * (texto un poco más chico, color secundario, padding reducido) para
 * marcar la diferencia jerárquica sin perder legibilidad.
 */
function SidebarLeafRow({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "block w-full truncate rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors",
        active
          ? "bg-[#9810FA]/8 font-medium text-[#9810FA]"
          : "text-[#0A0A0A]/65 hover:bg-[#11111108] hover:text-[#0A0A0A]",
      )}
    >
      {label}
    </button>
  );
}

// ─── Premium pill ──────────────────────────────────────────────────────

interface CategoryPillProps {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  /** "brand" = púrpura cuando active; "dark" = negro cuando active. */
  tone: "brand" | "dark";
  size?: "md" | "sm";
}

function CategoryPill({
  children,
  active,
  onClick,
  tone,
  size = "md",
}: CategoryPillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 rounded-full font-medium uppercase tracking-[0.18em] transition-all duration-200",
        size === "md"
          ? "px-3.5 py-1.5 text-[11px]"
          : "px-3 py-1 text-[10px] tracking-[0.16em]",
        active
          ? tone === "brand"
            ? "bg-[#9810FA] text-white shadow-[0_8px_18px_-12px_rgba(152,16,250,0.55)]"
            : "bg-[#0A0A0A] text-white"
          : "border border-[#11111118] bg-white text-[#0A0A0A]/70 hover:border-[#9810FA] hover:bg-white hover:text-[#9810FA]",
      )}
    >
      {children}
    </button>
  );
}

// ─── Resolución de path ────────────────────────────────────────────────

interface ActivePath {
  activeRoot: CategoryNode | null;
  activeSub: CategoryNode | null;
  activeLeaf: CategoryNode | null;
  mostSpecific: CategoryNode | null;
}

/**
 * Resuelve los slugs de URL al nodo más profundo válido. Conserva
 * compatibilidad con URLs viejas: si `category=` no matchea exactamente un
 * root, intenta match por nombre como fallback amigable.
 *
 * `sub` y `leaf` solo se aplican si su slug coincide exactamente bajo el
 * nodo previamente resuelto — no hacemos fallback ahí.
 */
function resolveActivePath(
  tree: CategoryNode[],
  rootSlug: string | undefined,
  subSlug: string | undefined,
  leafSlug: string | undefined,
  subcategoryShortcut: string | undefined,
): ActivePath {
  if (tree.length === 0) {
    return { activeRoot: null, activeSub: null, activeLeaf: null, mostSpecific: null };
  }

  // Shortcut "?subcategory=X" / "?subcat=X" — solo aplica si la URL no trae
  // un path explícito. Resolvemos el slug en cualquier profundidad y
  // reconstruimos el branch (root/sub/leaf) para mantener consistente el
  // resto de la UI (breadcrumbs, sidebar contextual, chips).
  if (!rootSlug && !subSlug && !leafSlug && subcategoryShortcut) {
    const found = findCategoryBySlugDeep(tree, subcategoryShortcut);
    if (found) {
      const branch = findCategoryBranchById(tree, found.id);
      const [r = null, s = null, l = null] = branch;
      return {
        activeRoot: r,
        activeSub: s,
        activeLeaf: l,
        mostSpecific: found,
      };
    }
    // No match — caemos a "sin filtro" en vez de romper la página.
  }

  let activeRoot: CategoryNode | null = null;
  if (rootSlug) {
    const needle = rootSlug.trim().toLowerCase();
    activeRoot =
      tree.find((c) => c.slug.toLowerCase() === needle) ??
      tree.find((c) => c.name.toLowerCase() === needle) ??
      null;
  }

  let activeSub: CategoryNode | null = null;
  if (activeRoot && subSlug) {
    const needle = subSlug.trim().toLowerCase();
    activeSub =
      activeRoot.children.find((c) => c.slug.toLowerCase() === needle) ?? null;
  }

  let activeLeaf: CategoryNode | null = null;
  if (activeSub && leafSlug) {
    const needle = leafSlug.trim().toLowerCase();
    activeLeaf =
      activeSub.children.find((c) => c.slug.toLowerCase() === needle) ?? null;
  }

  const mostSpecific = activeLeaf ?? activeSub ?? activeRoot;

  return { activeRoot, activeSub, activeLeaf, mostSpecific };
}
