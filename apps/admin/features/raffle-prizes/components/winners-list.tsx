"use client";

import { Crown, ImageOff, Loader2, Trophy } from "lucide-react";
import { Card, CardContent } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { formatDate } from "@/shared/lib/format";
import { usePublishedWinners } from "../hooks/use-prizes";

export function WinnersList() {
  const { data, isLoading } = usePublishedWinners();

  if (isLoading) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const list = data ?? [];

  if (list.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <EmptyState
            icon={Trophy}
            title="Aún no hay ganadores publicados"
            description="Cuando un admin publique oficialmente un ganador, aparecerá aquí y en la landing pública."
          />
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid gap-4 lg:grid-cols-2">
      {list.map((prize) => (
        <li key={prize.id}>
          <Card>
            <CardContent className="space-y-4 pt-5">
              <div className="flex items-start gap-3">
                <div className="relative size-20 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-strong">
                  {prize.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={prize.image}
                      alt={prize.title}
                      className="absolute inset-0 size-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground">
                      <ImageOff className="size-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-primary/15 px-1.5 py-0.5 text-xs font-medium text-primary">
                      {prize.position}°
                    </span>
                    <h3 className="truncate font-semibold">{prize.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Publicado el {formatDate(prize.publishedAt!)}
                  </p>
                </div>
              </div>

              {prize.winner ? (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
                  <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-primary">
                    <Crown className="size-3" /> Ganador oficial
                  </p>
                  <p className="mt-1 font-semibold">
                    {prize.winner.fullName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Ticket{" "}
                    <span className="font-mono">
                      #{prize.winner.ticketNumber.toString().padStart(5, "0")}
                    </span>{" "}
                    · DNI {prize.winner.dni ?? "—"}
                  </p>
                </div>
              ) : null}

              {prize.winnerAnnouncement ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {prize.winnerAnnouncement}
                </p>
              ) : null}

              {(prize.winnerPhoto || prize.winnerVideo) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {prize.winnerPhoto ? (
                    <a
                      href={prize.winnerPhoto}
                      target="_blank"
                      rel="noopener"
                      className="block overflow-hidden rounded-lg border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={prize.winnerPhoto}
                        alt={`Entrega ${prize.title}`}
                        className="aspect-video size-full object-cover"
                      />
                    </a>
                  ) : null}
                  {prize.winnerVideo ? (
                    <a
                      href={prize.winnerVideo}
                      target="_blank"
                      rel="noopener"
                      className="flex aspect-video items-center justify-center rounded-lg border border-border bg-surface/40 text-xs text-muted-foreground hover:bg-surface-strong"
                    >
                      Ver video de entrega →
                    </a>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  );
}
