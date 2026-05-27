"use client";

import {
  Crown,
  Loader2,
  LogOut,
  MapPin,
  Package,
  ShieldCheck,
  Ticket,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Container } from "@/shared/ui/container";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/format";
import {
  useMyMembership,
  useMyOrders,
} from "@/features/account/hooks/use-account";
import { useAuth, useLogout } from "@/features/auth/hooks/use-auth";
import { useMyRaffleEntries } from "@/features/raffles/hooks/use-raffles";
import { useUserMenuStore } from "@/stores/user-menu.store";
import {
  ORDER_STATUS_LABEL,
  RAFFLE_ENTRY_STATUS_LABEL,
  RAFFLE_ENTRY_TYPE_LABEL,
} from "@/types/api";

type Tab = "perfil" | "pedidos" | "sorteos" | "membresia" | "direcciones";

const TABS: Array<{ key: Tab; label: string; icon: typeof User }> = [
  { key: "perfil", label: "Perfil", icon: User },
  { key: "pedidos", label: "Pedidos", icon: Package },
  { key: "sorteos", label: "Tickets de sorteos", icon: Ticket },
  { key: "membresia", label: "Membresía", icon: Crown },
  { key: "direcciones", label: "Direcciones", icon: MapPin },
];

const VALID_TABS = new Set<string>(TABS.map((t) => t.key));

function readTabFromUrl(raw: string | null): Tab {
  if (raw && VALID_TABS.has(raw)) return raw as Tab;
  return "perfil";
}

export default function MiCuentaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, hydrated } = useAuth();
  const logout = useLogout();
  const openLogin = useUserMenuStore((s) => s.open);
  // Tab inicial sale de `?tab=` para soportar deep-linking desde el header
  // (UserMenu) hacia "Pedidos" / "Sorteos" sin romper la navegación interna.
  const [tab, setTab] = useState<Tab>(() =>
    readTabFromUrl(searchParams.get("tab")),
  );

  // Si el URL cambia externamente (back/forward), sincronizar.
  useEffect(() => {
    const next = readTabFromUrl(searchParams.get("tab"));
    setTab((current) => (current === next ? current : next));
  }, [searchParams]);

  // Sin sesión → home + abrir UserMenu (único login oficial).
  // El header maneja el render del panel; aquí solo signaleamos el intent.
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/");
      openLogin();
    }
  }, [hydrated, isAuthenticated, router, openLogin]);

  if (!hydrated || !user) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#0A0A0A]/45" />
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAFA] pb-20">
      <Container className="grid gap-6 py-10 lg:grid-cols-[260px_1fr]">
        <aside className="space-y-3">
          <div className="lux-card rounded-2xl p-5">
            <div className="flex items-center gap-3">
              <div className="flex size-12 items-center justify-center rounded-full bg-[#9810FA]/10 text-[#9810FA]">
                <User className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#0A0A0A]">
                  {user.firstName} {user.lastName}
                </p>
                <p className="truncate text-xs text-[#0A0A0A]/55">
                  {user.email}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-4 w-full"
              onClick={async () => {
                await logout.mutateAsync();
                router.replace("/");
              }}
              isLoading={logout.isPending}
            >
              <LogOut className="size-3.5" />
              Cerrar sesión
            </Button>
          </div>

          <nav className="lux-card overflow-hidden rounded-2xl">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors",
                  tab === key
                    ? "border-l-2 border-[#9810FA] bg-[#9810FA]/8 font-medium text-[#9810FA]"
                    : "text-[#0A0A0A]/70 hover:bg-[#11111108] hover:text-[#0A0A0A]",
                )}
              >
                <Icon className="size-4" />
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <section>
          {tab === "perfil" && <ProfileTab />}
          {tab === "pedidos" && <OrdersTab />}
          {tab === "sorteos" && <RaffleEntriesTab />}
          {tab === "membresia" && <MembershipTab />}
          {tab === "direcciones" && <AddressesTab />}
        </section>
      </Container>
    </div>
  );
}

function SectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <header className="mb-6 space-y-1">
      <h1 className="font-serif text-2xl tracking-tight text-[#0A0A0A] sm:text-3xl">
        {title}
      </h1>
      {description ? (
        <p className="text-sm text-[#0A0A0A]/55">{description}</p>
      ) : null}
    </header>
  );
}

function ProfileTab() {
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-5">
      <SectionHeader
        title="Tu perfil"
        description="Esta es la información asociada a tu cuenta del Club Púrpura."
      />
      <div className="lux-card grid gap-4 rounded-2xl p-6 sm:grid-cols-2">
        <Field label="Nombre" value={user.firstName} />
        <Field label="Apellido" value={user.lastName} />
        <Field label="Correo electrónico" value={user.email} />
        <Field label="Tipo de cuenta" value={user.role === "USER" ? "Cliente del club" : user.role} />
        <Field
          label="Miembro desde"
          value={formatDate(user.createdAt)}
        />
        <Field
          label="Actualización"
          value={formatDateTime(user.updatedAt)}
        />
      </div>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#0A0A0A]/45">
        <ShieldCheck className="size-3 text-[#9810FA]" />
        Tu información está protegida — para cambiar email o contraseña,
        contáctanos.
      </p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0A0A0A]/55">
        {label}
      </p>
      <p className="text-sm font-medium text-[#0A0A0A]">{value}</p>
    </div>
  );
}

function OrdersTab() {
  const { data, isLoading } = useMyOrders();
  const orders = data ?? [];

  return (
    <div>
      <SectionHeader
        title="Mis pedidos"
        description="Historial completo de tus compras en Purpura Club."
      />
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={Package}
          title="Aún no tienes pedidos"
          description="Cuando compres en la tienda aparecerán aquí con su comprobante."
          action={
            <Link href="/shop">
              <Button>Ir a la tienda</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {orders.map((o) => (
            <li
              key={o.id}
              className="lux-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs text-[#0A0A0A]/75">
                    {o.number}
                  </span>
                  <Badge tone={o.status === "PAID" ? "success" : o.status === "PENDING" ? "warning" : "default"}>
                    {ORDER_STATUS_LABEL[o.status]}
                  </Badge>
                </div>
                <p className="mt-1 text-xs text-[#0A0A0A]/55">
                  {formatDateTime(o.createdAt)} ·{" "}
                  {o.items.reduce((acc, i) => acc + i.quantity, 0)} producto(s)
                </p>
                {o.receipt ? (
                  <p className="mt-1 text-[10px] font-mono uppercase tracking-[0.18em] text-[#9810FA]">
                    {o.receipt.formatted}
                  </p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums text-[#0A0A0A]">
                  {formatCurrency(o.total)}
                </p>
                <p className="text-[10px] text-[#0A0A0A]/45">
                  IGV {formatCurrency(o.fiscal.igvAmount)}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function RaffleEntriesTab() {
  const { data, isLoading } = useMyRaffleEntries();
  const entries = data ?? [];

  return (
    <div>
      <SectionHeader
        title="Tus tickets de sorteo"
        description="Participaciones activas e históricas en sorteos del Club Púrpura."
      />
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <EmptyState
          icon={Ticket}
          title="Aún no tienes participaciones"
          description="Compra en la tienda — cada S/ 25 te da un ticket automático."
          action={
            <Link href="/sorteos">
              <Button variant="accent">Ver sorteos activos</Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {entries.map((e) => (
            <li
              key={e.id}
              className="lux-card flex items-center justify-between gap-3 rounded-xl p-4"
            >
              <div>
                <p className="text-sm font-medium text-[#0A0A0A]">
                  {e.raffleTitle}
                </p>
                <p className="text-[10px] uppercase tracking-[0.18em] text-[#0A0A0A]/45">
                  {RAFFLE_ENTRY_TYPE_LABEL[e.type]} ·{" "}
                  {RAFFLE_ENTRY_STATUS_LABEL[e.status]}
                </p>
              </div>
              <span className="rounded-full border border-[#9810FA]/25 bg-[#9810FA]/8 px-3 py-1 text-xs font-semibold tabular-nums text-[#9810FA]">
                #{e.ticketNumber}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MembershipTab() {
  const { data, isLoading } = useMyMembership();

  if (isLoading) {
    return (
      <div className="space-y-3">
        <SectionHeader title="Membresía" />
        <Skeleton className="h-40 w-full rounded-2xl" />
      </div>
    );
  }

  const active = data?.active && new Date(data.expiresAt) > new Date();

  return (
    <div>
      <SectionHeader
        title="Membresía del Club"
        description="Tu nivel actual y fecha de vencimiento."
      />
      <div
        className={cn(
          "relative isolate overflow-hidden rounded-2xl border p-6 sm:p-8",
          active
            ? "border-[#9810FA]/40 bg-[#0A0A0A] text-white"
            : "border-[#11111114] bg-white",
        )}
      >
        {active ? (
          <div
            aria-hidden
            className="absolute inset-0 opacity-50"
            style={{
              background:
                "radial-gradient(60% 60% at 0% 0%, rgba(152,16,250,0.45) 0%, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(192,38,211,0.35) 0%, transparent 60%)",
            }}
          />
        ) : null}
        <div className="relative space-y-3">
          <div className="flex items-center gap-2">
            <Crown
              className={cn(
                "size-5",
                active ? "text-[#9810FA]" : "text-[#0A0A0A]/45",
              )}
            />
            <span
              className={cn(
                "text-[10px] font-semibold uppercase tracking-[0.28em]",
                active ? "text-[#9810FA]" : "text-[#0A0A0A]/45",
              )}
            >
              {active ? "Miembro activo" : "Sin membresía activa"}
            </span>
          </div>
          <h2
            className={cn(
              "font-serif text-3xl tracking-tight",
              active ? "text-white" : "text-[#0A0A0A]",
            )}
          >
            Club Púrpura
          </h2>
          {active && data ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <Stat
                label="Activa desde"
                value={formatDate(data.startedAt)}
                dark
              />
              <Stat
                label="Vence"
                value={formatDate(data.expiresAt)}
                dark
              />
              <Stat
                label="Última compra"
                value={
                  data.lastPurchaseAt
                    ? formatDate(data.lastPurchaseAt)
                    : "—"
                }
                dark
              />
            </div>
          ) : (
            <p className="text-sm text-[#0A0A0A]/55">
              Realiza una compra calificada para activar tu membresía y empezar a
              recibir beneficios.
            </p>
          )}
          {!active ? (
            <Link href="/shop">
              <Button className="mt-2">Activar comprando</Button>
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  dark,
}: {
  label: string;
  value: string;
  dark?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-3",
        dark
          ? "border-white/10 bg-white/5"
          : "border-[#11111114] bg-white",
      )}
    >
      <p
        className={cn(
          "text-[10px] font-semibold uppercase tracking-[0.18em]",
          dark ? "text-white/55" : "text-[#0A0A0A]/45",
        )}
      >
        {label}
      </p>
      <p
        className={cn(
          "mt-1 text-sm font-medium",
          dark ? "text-white" : "text-[#0A0A0A]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function AddressesTab() {
  return (
    <div>
      <SectionHeader
        title="Mis direcciones"
        description="Pronto podrás guardar direcciones de envío preferidas."
      />
      <EmptyState
        icon={MapPin}
        title="Próximamente"
        description="Estamos preparando la gestión de direcciones para tus pedidos. Por ahora coordinamos contigo en el checkout."
      />
    </div>
  );
}
