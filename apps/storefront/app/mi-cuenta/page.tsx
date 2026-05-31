"use client";

import {
  CalendarDays,
  ChevronRight,
  Crown,
  IdCard,
  Loader2,
  LogOut,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Ticket,
  User,
  UserCircle2,
  Users,
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
import { AddressesTab } from "@/features/account/components/addresses-tab";
import {
  useMyMembership,
  useMyOrders,
} from "@/features/account/hooks/use-account";
import { useAuth, useLogout } from "@/features/auth/hooks/use-auth";
import { useMyRaffleEntries } from "@/features/raffles/hooks/use-raffles";
import { ReferralsTab } from "@/features/referrals/components/referrals-tab";
import {
  ORDER_STATUS_LABEL,
  RAFFLE_ENTRY_STATUS_LABEL,
  RAFFLE_ENTRY_TYPE_LABEL,
  type OrderEntity,
  type OrderStatus,
} from "@/types/api";

type Tab =
  | "perfil"
  | "pedidos"
  | "sorteos"
  | "membresia"
  | "referidos"
  | "direcciones";

const TABS: Array<{ key: Tab; label: string; icon: typeof User }> = [
  { key: "perfil", label: "Perfil", icon: User },
  { key: "pedidos", label: "Mis pedidos", icon: Package },
  { key: "sorteos", label: "Tickets de sorteos", icon: Ticket },
  { key: "membresia", label: "Membresía", icon: Crown },
  // F2.7-C / R3 — Tab independiente (no anidado en Membresía).
  { key: "referidos", label: "Referidos", icon: Users },
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

  // Sin sesión → redirigir a /login full-screen con `?next=/mi-cuenta`
  // para volver acá automáticamente tras autenticarse.
  useEffect(() => {
    if (hydrated && !isAuthenticated) {
      router.replace("/login?next=/mi-cuenta");
    }
  }, [hydrated, isAuthenticated, router]);

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
          {tab === "referidos" && <ReferralsTab />}
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

const GENDER_LABEL: Record<"MASCULINO" | "FEMENINO" | "OTRO", string> = {
  MASCULINO: "Masculino",
  FEMENINO: "Femenino",
  OTRO: "Otro",
};

function ProfileTab() {
  const { user } = useAuth();
  if (!user) return null;
  const profile = user.customerProfile;
  return profile ? (
    <ProfileFullView user={user} profile={profile} />
  ) : (
    <ProfileLegacyView user={user} />
  );
}

function ProfileFullView({
  user,
  profile,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
  profile: NonNullable<NonNullable<ReturnType<typeof useAuth>["user"]>["customerProfile"]>;
}) {
  const firstName = profile.firstName || user.firstName;
  const lastName = profile.lastName || user.lastName;
  const membershipActive =
    profile.isMember &&
    (!profile.membershipExpiresAt ||
      new Date(profile.membershipExpiresAt) > new Date());

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Tu perfil"
        description="Esta es la información asociada a tu cuenta del Club Púrpura."
      />

      <div className="lux-card rounded-2xl p-5 sm:p-6">
        <div className="mb-4 flex items-center gap-2">
          <UserCircle2 className="size-4 text-[#9810FA]" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
            Datos personales
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre" value={firstName} />
          <Field label="Apellido" value={lastName} />
          <Field label="Correo electrónico" value={user.email} />
          <Field
            label="DNI"
            value={profile.dni ?? "—"}
            icon={IdCard}
            muted={!profile.dni}
          />
          <Field
            label="Teléfono"
            value={profile.phone ?? "—"}
            icon={Phone}
            muted={!profile.phone}
          />
          <Field
            label="Fecha de nacimiento"
            value={
              profile.birthDate ? formatDate(profile.birthDate) : "—"
            }
            icon={CalendarDays}
            muted={!profile.birthDate}
          />
          <Field
            label="Género"
            value={profile.gender ? GENDER_LABEL[profile.gender] : "—"}
            muted={!profile.gender}
          />
        </div>
      </div>

      <div
        className={cn(
          "rounded-2xl border p-5 sm:p-6",
          membershipActive
            ? "border-[#9810FA]/30 bg-[#9810FA]/4"
            : "border-[#11111114] bg-white",
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Crown
              className={cn(
                "size-4",
                membershipActive ? "text-[#9810FA]" : "text-[#0A0A0A]/45",
              )}
            />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
              Membresía del Club
            </p>
          </div>
          <Badge tone={membershipActive ? "success" : "default"}>
            {membershipActive ? "Activa" : "Sin membresía"}
          </Badge>
        </div>
        <p className="mt-3 text-sm font-medium text-[#0A0A0A]">
          {membershipActive
            ? "Estás disfrutando los beneficios del Club Púrpura."
            : "Realiza una compra calificada para activarla."}
        </p>
        {profile.membershipExpiresAt ? (
          <p className="mt-1 text-xs text-[#0A0A0A]/55">
            {membershipActive ? "Vence el " : "Venció el "}
            {formatDate(profile.membershipExpiresAt)}
          </p>
        ) : null}
      </div>

      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#0A0A0A]/45">
        <ShieldCheck className="size-3 text-[#9810FA]" />
        Tu información está protegida — para cambiar email o contraseña,
        contáctanos.
      </p>
    </div>
  );
}

function ProfileLegacyView({
  user,
}: {
  user: NonNullable<ReturnType<typeof useAuth>["user"]>;
}) {
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
        <Field
          label="Tipo de cuenta"
          value={user.role === "USER" ? "Cliente del club" : user.role}
        />
        <Field label="Miembro desde" value={formatDate(user.createdAt)} />
        <Field label="Actualización" value={formatDateTime(user.updatedAt)} />
      </div>
      <p className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-[#0A0A0A]/45">
        <ShieldCheck className="size-3 text-[#9810FA]" />
        Tu información está protegida — para cambiar email o contraseña,
        contáctanos.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  icon: Icon,
  muted,
}: {
  label: string;
  value: string;
  icon?: typeof User;
  muted?: boolean;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {Icon ? <Icon className="size-3 text-[#0A0A0A]/45" /> : null}
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0A0A0A]/55">
          {label}
        </p>
      </div>
      <p
        className={cn(
          "text-sm font-medium",
          muted ? "text-[#0A0A0A]/35" : "text-[#0A0A0A]",
        )}
      >
        {value}
      </p>
    </div>
  );
}

const ORDER_STATUS_TONE: Record<
  OrderStatus,
  "warning" | "success" | "default" | "outline"
> = {
  PENDING: "warning",
  PAID: "success",
  PROCESSING: "warning",
  SHIPPED: "outline",
  DELIVERED: "success",
  CANCELLED: "default",
  REFUNDED: "outline",
};

function OrdersTab() {
  const { data, isLoading } = useMyOrders();
  const orders = data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-5">
        <SectionHeader
          title="Mis pedidos"
          description="Historial de tus compras en Purpura Club."
        />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return <OrdersEmptyState />;
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Mis pedidos"
        description="Historial de tus compras en Purpura Club."
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {orders.map((order) => (
          <OrderCard key={order.id} order={order} />
        ))}
      </ul>
    </div>
  );
}

function OrdersEmptyState() {
  return (
    <div className="space-y-5">
      <SectionHeader title="Mis pedidos" />
      <div className="relative isolate overflow-hidden rounded-2xl border border-[#11111114] bg-white px-6 py-14 text-center sm:py-20">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 opacity-60"
          style={{
            background:
              "radial-gradient(50% 50% at 50% 0%, rgba(152,16,250,0.08) 0%, transparent 70%)",
          }}
        />
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[#9810FA]/10 text-[#9810FA]">
          <Package className="size-5" />
        </div>
        <h3 className="mt-4 font-serif text-2xl tracking-tight text-[#0A0A0A]">
          Aún no tienes pedidos
        </h3>
        <p className="mx-auto mt-2 max-w-sm text-sm text-[#0A0A0A]/55">
          Cuando realices tu primera compra podrás seguir el estado de tus
          pedidos desde aquí.
        </p>
        <Link href="/shop" className="mt-6 inline-block">
          <Button>Explorar productos</Button>
        </Link>
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: OrderEntity }) {
  const itemsCount = order.items.reduce((acc, i) => acc + i.quantity, 0);
  return (
    <li>
      <Link
        href={`/mi-cuenta/pedidos/${order.number}`}
        className="lux-card group flex h-full flex-col gap-4 rounded-2xl p-5 transition-colors hover:border-[#9810FA]/30"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/45">
              Pedido
            </p>
            <p className="mt-0.5 font-mono text-sm text-[#0A0A0A]">
              #{order.number}
            </p>
          </div>
          <Badge tone={ORDER_STATUS_TONE[order.status]}>
            {ORDER_STATUS_LABEL[order.status]}
          </Badge>
        </div>

        <div className="text-xs text-[#0A0A0A]/55">
          {formatDate(order.createdAt)}
          <span className="mx-1.5 text-[#0A0A0A]/25">·</span>
          {itemsCount} {itemsCount === 1 ? "producto" : "productos"}
        </div>

        <div className="mt-auto flex items-end justify-between gap-3 pt-1">
          <p className="text-xl font-semibold tabular-nums tracking-tight text-[#0A0A0A]">
            {formatCurrency(order.total)}
          </p>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-[#9810FA] transition-transform group-hover:translate-x-0.5">
            Ver detalle
            <ChevronRight className="size-3.5" />
          </span>
        </div>
      </Link>
    </li>
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

// FASE 2 / F2.5 — La implementación real vive en
// features/account/components/addresses-tab.tsx para mantener acotado el
// blast radius. Aquí solo se importa y se renderiza dentro del switch
// del tab activo.
