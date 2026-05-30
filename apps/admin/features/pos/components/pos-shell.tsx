"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  Clock,
  LayoutDashboard,
  LogOut,
  Maximize,
  ScanLine,
  Wallet,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { userHasAnyPermission } from "@/stores/auth.store";
import { usePosLocation } from "@/features/pos/hooks/use-pos";

interface PosShellProps {
  slug?: string;
  children: ReactNode;
}

/**
 * Shell standalone del POS — light luxury retail.
 *
 * Independiente del sidebar admin. Touch-friendly y fullscreen para tablet
 * y laptops táctiles. Branding oficial Purpura Club (logotipo horizontal).
 *
 *  ┌──────────────────────────────────────────────────────────────────┐
 *  │  [LOGOTIPO]                          🕒 14:32 · Admin · 👤 · ⎋    │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │  Vender  ·  Caja  ·  Devoluciones                                 │
 *  ├──────────────────────────────────────────────────────────────────┤
 *  │                          <children>                               │
 *  └──────────────────────────────────────────────────────────────────┘
 */
export function PosShell({ slug, children }: PosShellProps) {
  const pathname = usePathname();
  const { user } = useAuth();
  const { data: location } = usePosLocation(slug);

  const canReturnToAdmin = userHasAnyPermission(user, [
    "users.view",
    "rbac.manage",
    "reports.view",
  ]);

  const tabs = slug
    ? ([
        {
          href: `/pos/${slug}`,
          label: "Vender",
          icon: ScanLine,
          match: (p: string) => p === `/pos/${slug}`,
        },
        {
          href: `/pos/${slug}/caja`,
          label: "Caja",
          icon: Wallet,
          match: (p: string) => p.startsWith(`/pos/${slug}/caja`),
        },
        {
          href: `/pos/${slug}/devoluciones`,
          label: "Devoluciones",
          icon: ArrowLeftRight,
          match: (p: string) => p.startsWith(`/pos/${slug}/devoluciones`),
        },
      ] as const)
    : [];

  return (
    <div className="flex min-h-screen w-full flex-col bg-[#FAFAFA] text-[#0A0A0A]">
      <PosTopBar
        locationName={location?.name}
        locationType={location?.type}
        canReturnToAdmin={canReturnToAdmin}
        showFullscreen={Boolean(slug)}
      />

      {tabs.length > 0 ? (
        <nav
          className="sticky top-16 z-20 flex items-center gap-1 border-b border-[#11111111] bg-white/90 px-4 backdrop-blur md:px-6"
          aria-label="Secciones del POS"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.match(pathname);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors",
                  active
                    ? "text-[#0A0A0A]"
                    : "text-[#0A0A0A]/55 hover:text-[#0A0A0A]",
                )}
              >
                <Icon
                  className={cn(
                    "size-4",
                    active ? "text-[#9810FA]" : "text-[#0A0A0A]/45",
                  )}
                />
                {tab.label}
                {active ? (
                  <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[#9810FA]" />
                ) : null}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-screen-2xl space-y-5">
          {children}
        </div>
      </main>
    </div>
  );
}

interface PosTopBarProps {
  locationName?: string;
  locationType?: string;
  canReturnToAdmin: boolean;
  showFullscreen: boolean;
}

function PosTopBar({
  locationName,
  locationType,
  canReturnToAdmin,
  showFullscreen,
}: PosTopBarProps) {
  const { user, logout } = useAuth();
  const [now, setNow] = useState<string>(() => formatNow());

  useEffect(() => {
    const id = setInterval(() => setNow(formatNow()), 30_000);
    return () => clearInterval(id);
  }, []);

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`
      .toUpperCase()
      .trim() || "PP";

  const requestFullscreen = () => {
    if (typeof document === "undefined") return;
    const el = document.documentElement;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-[#11111111] bg-white/95 px-4 backdrop-blur-md md:px-6">
      <div className="flex items-center gap-4">
        <Link href="/pos" aria-label="Purpura POS" className="flex items-center">
          <Image
            src="/brand/logotipo-nuevo-1.svg"
            alt="Purpura Club"
            width={240}
            height={90}
            priority
            className="h-9 w-auto"
          />
        </Link>

        {locationName ? (
          <div className="hidden border-l border-[#11111111] pl-4 lg:flex lg:flex-col lg:leading-tight">
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#0A0A0A]/45">
              {locationType ?? "Sucursal"}
            </span>
            <span className="text-sm font-semibold text-[#0A0A0A]">
              {locationName}
            </span>
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden items-center gap-1.5 rounded-full border border-[#11111111] bg-white px-3 py-1.5 text-xs text-[#0A0A0A]/65 md:flex">
          <Clock className="size-3.5 text-[#0A0A0A]/40" />
          {now}
        </div>

        {showFullscreen ? (
          <button
            type="button"
            onClick={requestFullscreen}
            className="hidden rounded-md border border-[#11111111] bg-white p-2 text-[#0A0A0A]/60 transition-colors hover:border-[#9810FA]/30 hover:text-[#9810FA] sm:inline-flex"
            aria-label="Pantalla completa"
            title="Pantalla completa"
          >
            <Maximize className="size-4" />
          </button>
        ) : null}

        {canReturnToAdmin ? (
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-md border border-[#11111111] bg-white px-3 py-1.5 text-xs font-medium text-[#0A0A0A]/75 transition-colors hover:border-[#9810FA]/30 hover:text-[#9810FA]"
          >
            <LayoutDashboard className="size-3.5" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        ) : null}

        {user ? (
          <div className="flex items-center gap-2 rounded-full border border-[#11111111] bg-white px-2 py-1.5 pr-3">
            <span className="flex size-7 items-center justify-center rounded-full bg-linear-to-br from-[#9810FA] to-[#C026D3] text-xs font-semibold text-white">
              {initials}
            </span>
            <div className="hidden flex-col leading-tight sm:flex">
              <span className="text-xs font-medium text-[#0A0A0A]">
                {user.firstName} {user.lastName}
              </span>
              <span className="text-[10px] uppercase tracking-wider text-[#0A0A0A]/45">
                Cajero
              </span>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="ml-1 rounded-full p-1 text-[#0A0A0A]/40 transition-colors hover:bg-[#E11D48]/8 hover:text-[#E11D48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}

const formatNow = (): string => {
  try {
    return new Intl.DateTimeFormat("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date());
  } catch {
    return "";
  }
};
