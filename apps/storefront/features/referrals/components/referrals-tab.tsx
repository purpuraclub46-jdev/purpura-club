"use client";

import {
  Check,
  Copy,
  Gift,
  Loader2,
  Share2,
  Sparkles,
  Ticket,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { formatDate } from "@/shared/lib/format";
import { copyToClipboard } from "@/shared/lib/clipboard";
import {
  buildReferralShareMessage,
  buildWhatsAppShareUrl,
} from "@/shared/lib/whatsapp";
import { useMyReferrals } from "@/features/referrals/hooks/use-referrals";
import { toast } from "@/stores/toast.store";
import {
  REFERRAL_HISTORY_STATUS_LABEL,
  type ReferralHistoryItem,
} from "@/types/api";

/**
 * F2.7-C — Tab "Referidos" del panel /mi-cuenta.
 *
 * Muestra el código + URL + stats + historial del usuario. Las acciones de
 * compartir (clipboard y WhatsApp) usan los helpers de shared/lib.
 *
 * R8 — Los nombres del historial vienen ya ofuscados por el backend (Pedro G.)
 * para que esta vista NUNCA exponga PII completa.
 */
export function ReferralsTab() {
  const { data, isLoading, isError } = useMyReferrals();

  if (isLoading) {
    return (
      <div className="space-y-5">
        <TabHeader />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid gap-3 sm:grid-cols-3">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="space-y-5">
        <TabHeader />
        <EmptyState
          icon={Users}
          title="No pudimos cargar tu programa de referidos"
          description="Recarga la página o inténtalo nuevamente más tarde."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <TabHeader />
      <ShareCard
        referralCode={data.referralCode}
        referralUrl={data.referralUrl}
      />
      <StatsGrid
        registered={data.stats.registered}
        qualified={data.stats.qualified}
        ticketsEarned={data.stats.ticketsEarned}
      />
      <HistoryList items={data.history} />
    </div>
  );
}

function TabHeader() {
  return (
    <header className="space-y-1">
      <h1 className="font-serif text-2xl tracking-tight text-[#0A0A0A] sm:text-3xl">
        Invita amigos · Gana tickets
      </h1>
      <p className="text-sm text-[#0A0A0A]/55">
        Por cada amigo que se registre con tu enlace y haga una compra
        calificada (S/25 o más), recibes{" "}
        <span className="font-semibold text-[#9810FA]">+1 ticket de sorteo</span>{" "}
        automáticamente.
      </p>
    </header>
  );
}

function ShareCard({
  referralCode,
  referralUrl,
}: {
  referralCode: string;
  referralUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyToClipboard(referralUrl);
    if (ok) {
      setCopied(true);
      toast.success("Enlace copiado", "Pégalo donde quieras compartirlo.");
      setTimeout(() => setCopied(false), 2500);
    } else {
      toast.error("No pudimos copiar el enlace", "Inténtalo manualmente.");
    }
  };

  const whatsappHref = buildWhatsAppShareUrl(
    buildReferralShareMessage(referralUrl),
  );

  return (
    <div className="relative isolate overflow-hidden rounded-2xl border border-[#9810FA]/25 bg-white p-5 sm:p-6">
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-40"
        style={{
          background:
            "radial-gradient(60% 60% at 0% 0%, rgba(152,16,250,0.15) 0%, transparent 60%), radial-gradient(60% 60% at 100% 100%, rgba(192,38,211,0.10) 0%, transparent 60%)",
        }}
      />
      <div className="flex items-center gap-2">
        <Sparkles className="size-4 text-[#9810FA]" />
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
          Tu enlace de referido
        </p>
      </div>

      <p className="mt-3 text-[10px] font-medium uppercase tracking-[0.18em] text-[#0A0A0A]/45">
        Código
      </p>
      <p className="mt-1 font-mono text-base font-semibold tabular-nums tracking-tight text-[#0A0A0A] sm:text-lg">
        {referralCode}
      </p>

      <div className="mt-4 flex flex-col gap-2 rounded-xl border border-[#11111114] bg-[#FAFAFA] p-3 text-xs text-[#0A0A0A]/75 sm:flex-row sm:items-center sm:gap-3">
        <p className="flex-1 break-all font-mono">{referralUrl}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="gap-1.5"
          >
            {copied ? (
              <>
                <Check className="size-3.5" />
                Copiado
              </>
            ) : (
              <>
                <Copy className="size-3.5" />
                Copiar enlace
              </>
            )}
          </Button>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-[#25D366] px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-[#1ebe57]"
          >
            <Share2 className="size-3.5" />
            WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function StatsGrid({
  registered,
  qualified,
  ticketsEarned,
}: {
  registered: number;
  qualified: number;
  ticketsEarned: number;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <StatCard
        icon={Users}
        label="Registrados"
        value={registered}
        hint="Amigos que abrieron cuenta"
      />
      <StatCard
        icon={Gift}
        label="Calificados"
        value={qualified}
        hint="Hicieron compra ≥ S/25"
      />
      <StatCard
        icon={Ticket}
        label="Tickets ganados"
        value={ticketsEarned}
        hint="Bonus de sorteo recibidos"
        accent
      />
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  hint: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        accent
          ? "border-[#9810FA]/30 bg-[#9810FA]/5"
          : "border-[#11111114] bg-white",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon
          className={cn(
            "size-4",
            accent ? "text-[#9810FA]" : "text-[#0A0A0A]/45",
          )}
        />
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0A0A0A]/55">
          {label}
        </p>
      </div>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-[#0A0A0A]">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-[#0A0A0A]/55">{hint}</p>
    </div>
  );
}

function HistoryList({ items }: { items: ReferralHistoryItem[] }) {
  if (items.length === 0) {
    return (
      <div className="lux-card rounded-2xl p-8 text-center">
        <Loader2 className="mx-auto size-6 animate-spin text-[#0A0A0A]/25" />
        <h3 className="mt-3 font-serif text-xl tracking-tight text-[#0A0A0A]">
          Aún no tienes referidos
        </h3>
        <p className="mx-auto mt-1 max-w-sm text-sm text-[#0A0A0A]/55">
          Comparte tu enlace para empezar a invitar amigos. Recibirás tu primer
          ticket cuando alguno haga una compra calificada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#0A0A0A]/55">
        Historial
      </h2>
      <ul className="lux-card divide-y divide-[#11111110] overflow-hidden rounded-2xl">
        {items.map((item) => (
          <HistoryRow key={item.id} item={item} />
        ))}
      </ul>
    </div>
  );
}

function HistoryRow({ item }: { item: ReferralHistoryItem }) {
  const qualified = item.status === "QUALIFIED";
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-[#0A0A0A]">
          {item.displayName || "Invitado"}
        </p>
        <p className="text-[11px] text-[#0A0A0A]/55">
          {REFERRAL_HISTORY_STATUS_LABEL[item.status]} ·{" "}
          {formatDate(item.createdAt)}
        </p>
      </div>
      {qualified ? (
        <Badge tone="success">+{item.ticketsAwarded} ticket</Badge>
      ) : (
        <Badge tone="warning">Pendiente</Badge>
      )}
    </li>
  );
}
