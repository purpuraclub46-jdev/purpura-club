"use client";

import Link from "next/link";
import {
  ArrowRight,
  Package,
  ShoppingBag,
  Sparkles,
  Tags,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { PageHeader } from "@/shared/ui/page-header";
import { formatCurrency } from "@/shared/lib/format";
import { useCategoriesList } from "@/features/categories/hooks/use-categories";
import { useProductsList } from "@/features/products/hooks/use-products";
import { useOrdersList } from "@/features/orders/hooks/use-orders";

const SHORTCUTS = [
  {
    href: "/productos",
    icon: Package,
    title: "Productos",
    description: "Catálogo de joyería, perfumes y accesorios.",
  },
  {
    href: "/categorias",
    icon: Tags,
    title: "Categorías",
    description: "Organiza el catálogo por grupos y subcategorías.",
  },
  {
    href: "/pedidos",
    icon: ShoppingBag,
    title: "Pedidos",
    description: "Gestión de órdenes y estados de pago.",
  },
];

export default function EcommercePage() {
  const products = useProductsList({ page: 1, limit: 1 });
  const featured = useProductsList({ page: 1, limit: 1, featured: true });
  const categories = useCategoriesList({ page: 1, limit: 1 });
  const orders = useOrdersList({ page: 1, limit: 5 });

  const stats = [
    {
      label: "Productos activos",
      value: products.data?.meta.total ?? 0,
      icon: Package,
    },
    {
      label: "Destacados",
      value: featured.data?.meta.total ?? 0,
      icon: Sparkles,
    },
    {
      label: "Categorías",
      value: categories.data?.meta.total ?? 0,
      icon: Tags,
    },
    {
      label: "Pedidos",
      value: orders.data?.meta.total ?? 0,
      icon: ShoppingBag,
    },
  ];

  return (
    <>
      <PageHeader
        title="Ecommerce"
        description="Vista general del catálogo, pedidos y operación comercial."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    {stat.label}
                  </p>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">
                    {stat.value.toLocaleString("es-PE")}
                  </p>
                </div>
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {SHORTCUTS.map((shortcut) => {
          const Icon = shortcut.icon;
          return (
            <Link
              key={shortcut.href}
              href={shortcut.href}
              className="group rounded-xl border border-border bg-surface/60 p-5 transition-colors hover:border-primary/40 hover:bg-surface-strong"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold">{shortcut.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {shortcut.description}
                  </p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Últimos pedidos</CardTitle>
          <CardDescription>Las cinco órdenes más recientes.</CardDescription>
        </CardHeader>
        <CardContent>
          {orders.isLoading ? (
            <p className="text-sm text-muted-foreground">Cargando…</p>
          ) : !orders.data?.items.length ? (
            <p className="text-sm text-muted-foreground">
              Aún no hay pedidos registrados.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {orders.data.items.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/pedidos/${order.id}`}
                    className="flex items-center justify-between gap-4 py-3 hover:text-primary"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-medium">
                        {order.number}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {order.customer?.fullName ?? "Sin cliente"}
                      </p>
                    </div>
                    <span className="tabular-nums text-sm font-medium">
                      {formatCurrency(order.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
