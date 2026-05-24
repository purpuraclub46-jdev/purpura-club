"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, Send, Trash2, Trophy } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PageHeader } from "@/shared/ui/page-header";
import { extractErrorMessage } from "@/services/http/client";
import { formatCurrency } from "@/shared/lib/format";
import { toast } from "@/stores/toast.store";
import { useRaffle } from "@/features/raffles/hooks/use-raffles";
import {
  useDeleteRaffle,
  usePublishRaffle,
} from "@/features/raffles/hooks/use-raffle-mutations";
import { useDrawWinner } from "@/features/raffle-entries/hooks/use-raffle-entries";
import { RaffleForm } from "@/features/raffles/components/raffle-form";
import {
  RaffleStatusBadge,
  RaffleVisibilityBadge,
} from "@/features/raffles/components/raffle-status-badge";

export function RaffleDetailView({ id }: { id: string }) {
  const router = useRouter();
  const { data: raffle, isLoading, isError } = useRaffle(id);
  const publish = usePublishRaffle();
  const remove = useDeleteRaffle();
  const draw = useDrawWinner();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmDraw, setConfirmDraw] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !raffle) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/sorteos">
            <ArrowLeft className="size-4" /> Volver a sorteos
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Sorteo no encontrado.
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePublish = async () => {
    try {
      await publish.mutateAsync(raffle.id);
      toast.success("Sorteo publicado");
    } catch (error) {
      toast.error("No se pudo publicar", extractErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    try {
      await remove.mutateAsync(raffle.id);
      toast.success("Sorteo eliminado");
      router.replace("/sorteos");
    } catch (error) {
      toast.error("No se pudo eliminar", extractErrorMessage(error));
    }
  };

  const handleDraw = async () => {
    try {
      const winner = await draw.mutateAsync({ raffleId: raffle.id });
      toast.success(
        "Ganador elegido",
        `Ticket #${winner.ticketNumber} — ${winner.user?.firstName ?? ""} ${winner.user?.lastName ?? ""}`.trim(),
      );
      setConfirmDraw(false);
    } catch (error) {
      toast.error("No se pudo realizar el sorteo", extractErrorMessage(error));
    }
  };

  const drawDisabled =
    raffle.soldTickets === 0 || Boolean(raffle.winnerUserId);

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/sorteos">
          <ArrowLeft className="size-4" /> Volver a sorteos
        </Link>
      </Button>

      <PageHeader
        title={raffle.title}
        description={
          <span className="inline-flex items-center gap-2">
            <RaffleStatusBadge status={raffle.status} />
            <RaffleVisibilityBadge visibility={raffle.visibility} />
            <span className="text-xs text-muted-foreground">/{raffle.slug}</span>
          </span>
        }
        actions={
          <>
            <Button variant="outline" onClick={() => setConfirmDelete(true)}>
              <Trash2 className="size-4" /> Eliminar
            </Button>
            <Button
              variant="outline"
              onClick={() => setConfirmDraw(true)}
              disabled={drawDisabled}
            >
              <Trophy className="size-4" /> Elegir ganador
            </Button>
            <Button
              onClick={() => void handlePublish()}
              isLoading={publish.isPending}
              disabled={
                raffle.status === "PUBLISHED" || raffle.status === "CANCELLED"
              }
            >
              <Send className="size-4" /> Publicar
            </Button>
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-5">
        <Card className="xl:col-span-3">
          <CardHeader>
            <CardTitle>Detalles del sorteo</CardTitle>
          </CardHeader>
          <CardContent>
            <RaffleForm mode="edit" initial={raffle} />
          </CardContent>
        </Card>

        <div className="space-y-6 xl:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Inventario y precios</CardTitle>
              <CardDescription>
                Cifras en tiempo real para este sorteo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Tickets vendidos</span>
                <span className="tabular-nums font-medium">
                  {raffle.soldTickets.toLocaleString("es-PE")} /{" "}
                  {raffle.totalTickets.toLocaleString("es-PE")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Disponibles</span>
                <span className="tabular-nums font-medium">
                  {raffle.remainingTickets.toLocaleString("es-PE")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Precio público</span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(raffle.ticketPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Precio miembro</span>
                <span className="tabular-nums font-medium">
                  {formatCurrency(raffle.memberTicketPrice)}
                </span>
              </div>
              {raffle.winnerUserId ? (
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-muted-foreground">Ganador</span>
                  <span className="font-mono text-xs">
                    {raffle.winnerUserId.slice(0, 8)}
                  </span>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="¿Eliminar sorteo?"
        description={`«${raffle.title}» y todas sus participaciones se eliminarán de forma permanente.`}
        confirmLabel="Eliminar"
        destructive
        isLoading={remove.isPending}
        onConfirm={() => void handleDelete()}
      />

      <ConfirmDialog
        open={confirmDraw}
        onOpenChange={setConfirmDraw}
        title="¿Elegir ganador del sorteo?"
        description="Se seleccionará al azar una participación pagada. Esta acción cerrará el sorteo y no se puede deshacer."
        confirmLabel="Elegir ganador"
        isLoading={draw.isPending}
        onConfirm={() => void handleDraw()}
      />
    </>
  );
}
