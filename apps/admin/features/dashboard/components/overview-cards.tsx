"use client";

import { CreditCard, FileEdit, Sparkles, Ticket } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatNumber } from "@/shared/lib/format";
import { useRafflesList } from "@/features/raffles/hooks/use-raffles";
import { useRaffleEntriesList } from "@/features/raffle-entries/hooks/use-raffle-entries";

interface MetricProps {
  label: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  isLoading?: boolean;
  accent?: string;
}

function Metric({
  label,
  value,
  description,
  icon: Icon,
  isLoading,
  accent = "from-primary to-accent",
}: MetricProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between pb-2">
        <div className="space-y-1">
          <CardDescription className="text-xs uppercase tracking-[0.22em]">
            {label}
          </CardDescription>
          {isLoading ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <CardTitle className="text-3xl font-semibold tracking-tight">
              {typeof value === "number" ? formatNumber(value) : value}
            </CardTitle>
          )}
        </div>
        <div
          className={`flex size-10 items-center justify-center rounded-lg bg-gradient-to-br text-primary-foreground shadow-md ${accent}`}
        >
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
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
      />
      <Metric
        label="Borradores"
        value={drafts.data?.meta.total ?? 0}
        description="Pendientes de publicar"
        icon={FileEdit}
        isLoading={drafts.isLoading}
        accent="from-accent to-primary"
      />
      <Metric
        label="Tickets confirmados"
        value={paidEntries.data?.meta.total ?? 0}
        description="Participaciones pagadas en todos los sorteos"
        icon={Ticket}
        isLoading={paidEntries.isLoading}
        accent="from-success/80 to-success"
      />
      <Metric
        label="Pagos pendientes"
        value={pendingEntries.data?.meta.total ?? 0}
        description="Vouchers Yape por revisar"
        icon={CreditCard}
        isLoading={pendingEntries.isLoading}
        accent="from-warning/80 to-warning"
      />
    </div>
  );
}
