"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  CreditCard,
  FileEdit,
  Sparkles,
  Ticket,
} from "lucide-react";
import { Skeleton } from "@/shared/ui/skeleton";
import { cn } from "@/shared/lib/cn";
import { formatNumber } from "@/shared/lib/format";
import { useRafflesList } from "@/features/raffles/hooks/use-raffles";
import { useRaffleEntriesList } from "@/features/raffle-entries/hooks/use-raffle-entries";

interface MetricProps {
  label: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  tone?: "default" | "success" | "warning";
  href?: string;
}

const TONE_RING: Record<NonNullable<MetricProps["tone"]>, string> = {
  default: "bg-[#9810FA]/10 text-[#9810FA]",
  success: "bg-emerald-500/10 text-emerald-600",
  warning: "bg-amber-500/10 text-amber-600",
};

function Metric({
  label,
  value,
  description,
  icon: Icon,
  isLoading,
  tone = "default",
  href,
}: MetricProps) {
  const inner = (
    <article className="lux-card group relative h-full rounded-xl p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#11111118] hover:shadow-[0_18px_36px_-18px_rgba(17,17,17,0.16)]">
      <div className="flex items-start justify-between gap-3">
        <span
          className={cn(
            "inline-flex size-10 items-center justify-center rounded-lg",
            TONE_RING[tone],
          )}
        >
          <Icon className="size-5" />
        </span>
        {href ? (
          <ArrowUpRight className="size-4 text-[#0A0A0A]/30 transition-colors group-hover:text-[#9810FA]" />
        ) : null}
      </div>
      <div className="mt-5 space-y-1.5">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-[#0A0A0A]/50">
          {label}
        </p>
        {isLoading ? (
          <Skeleton className="h-9 w-24" />
        ) : (
          <p className="text-[32px] font-semibold tracking-tight text-[#0A0A0A] tabular-nums">
            {typeof value === "number" ? formatNumber(value) : value}
          </p>
        )}
        {description ? (
          <p className="text-xs text-[#0A0A0A]/55">{description}</p>
        ) : null}
      </div>
    </article>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

export function OverviewCards() {
  const upcoming = useRafflesList({
    page: 1,
    limit: 1,
    timeFilter: "upcoming",
    status: "PUBLISHED",
  });
  const drafts = useRafflesList({
    page: 1,
    limit: 1,
    status: "DRAFT",
  });
  const paidEntries = useRaffleEntriesList({
    page: 1,
    limit: 1,
    status: "PAID",
  });
  const pendingEntries = useRaffleEntriesList({
    page: 1,
    limit: 1,
    status: "PENDING_PAYMENT",
  });

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Metric
        label="Sorteos activos"
        value={upcoming.data?.meta.total ?? 0}
        description="Publicados con fecha futura"
        icon={Sparkles}
        isLoading={upcoming.isLoading}
        href="/sorteos"
      />
      <Metric
        label="Borradores"
        value={drafts.data?.meta.total ?? 0}
        description="Pendientes de publicar"
        icon={FileEdit}
        isLoading={drafts.isLoading}
        href="/sorteos"
      />
      <Metric
        label="Tickets confirmados"
        value={paidEntries.data?.meta.total ?? 0}
        description="Participaciones pagadas en todos los sorteos"
        icon={Ticket}
        isLoading={paidEntries.isLoading}
        tone="success"
        href="/sorteos/participaciones"
      />
      <Metric
        label="Pagos pendientes"
        value={pendingEntries.data?.meta.total ?? 0}
        description="Vouchers Yape por revisar"
        icon={CreditCard}
        isLoading={pendingEntries.isLoading}
        tone="warning"
        href="/sorteos/participaciones"
      />
    </div>
  );
}
