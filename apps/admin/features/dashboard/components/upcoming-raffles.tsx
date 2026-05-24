"use client";

import Link from "next/link";
import { ArrowRight, Ticket } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Skeleton } from "@/shared/ui/skeleton";
import { formatDate } from "@/shared/lib/format";
import {
  RaffleStatusBadge,
  RaffleVisibilityBadge,
} from "@/features/raffles/components/raffle-status-badge";
import { useRafflesList } from "@/features/raffles/hooks/use-raffles";

export function UpcomingRaffles() {
  const { data, isLoading } = useRafflesList({
    page: 1,
    limit: 5,
    timeFilter: "upcoming",
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="space-y-1">
          <CardTitle>Próximos sorteos</CardTitle>
          <CardDescription>
            Los próximos 5 sorteos en agenda.
          </CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link href="/sorteos">
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <>
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </>
        ) : !data || data.items.length === 0 ? (
          <EmptyState
            title="Sin sorteos próximos"
            description="Crea tu primer sorteo para comenzar a vender tickets."
            action={
              <Button asChild size="sm">
                <Link href="/sorteos/nuevo">Crear sorteo</Link>
              </Button>
            }
          />
        ) : (
          data.items.map((raffle) => (
            <Link
              key={raffle.id}
              href={`/sorteos/${raffle.id}`}
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface/40 p-3 transition-colors hover:border-border-strong hover:bg-surface-strong/40 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{raffle.title}</span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span>{formatDate(raffle.startDate)}</span>
                  <span className="inline-flex items-center gap-1">
                    <Ticket className="size-3" />
                    {raffle.soldTickets.toLocaleString("es-PE")} /{" "}
                    {raffle.totalTickets.toLocaleString("es-PE")} tickets
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <RaffleStatusBadge status={raffle.status} />
                <RaffleVisibilityBadge visibility={raffle.visibility} />
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
