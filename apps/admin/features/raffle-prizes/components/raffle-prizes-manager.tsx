"use client";

import { useState } from "react";
import {
  Crown,
  ImageOff,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  RotateCcw,
  Send,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { EmptyState } from "@/shared/ui/empty-state";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import {
  useClearPrizeWinner,
  useDeletePrize,
  usePrizesByRaffle,
} from "../hooks/use-prizes";
import type { PrizeEntity } from "../types";
import { AssignWinnerDialog } from "./assign-winner-dialog";
import { PrizeFormDialog } from "./prize-form-dialog";
import { PrizeStatusBadge } from "./prize-status-badge";
import { PublishWinnerDialog } from "./publish-winner-dialog";

interface Props {
  raffleId: string;
}

export function RafflePrizesManager({ raffleId }: Props) {
  const { data: prizes, isLoading } = usePrizesByRaffle(raffleId);
  const remove = useDeletePrize();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PrizeEntity | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PrizeEntity | null>(null);
  const [assignTarget, setAssignTarget] = useState<PrizeEntity | null>(null);
  const [publishTarget, setPublishTarget] = useState<PrizeEntity | null>(null);

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      await remove.mutateAsync(confirmDelete.id);
      toast.success("Premio eliminado");
      setConfirmDelete(null);
    } catch (error) {
      toast.error("No se pudo eliminar", extractErrorMessage(error));
    }
  };

  const list = prizes ?? [];
  const nextPosition =
    list.length === 0 ? 1 : Math.max(...list.map((p) => p.position)) + 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Premios</h2>
          <p className="text-xs text-muted-foreground">
            Cada premio se asigna manualmente con el número de ticket ganador
            exportado del sorteo externo.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="size-4" /> Nuevo premio
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={Trophy}
              title="Aún no hay premios"
              description="Agrega al menos un premio antes de cerrar el sorteo. Puedes tener varios (1°, 2°, 3°…)."
            />
          </CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {list.map((prize) => (
            <PrizeCard
              key={prize.id}
              prize={prize}
              onEdit={() => {
                setEditing(prize);
                setFormOpen(true);
              }}
              onDelete={() => setConfirmDelete(prize)}
              onAssign={() => setAssignTarget(prize)}
              onPublish={() => setPublishTarget(prize)}
            />
          ))}
        </ul>
      )}

      <PrizeFormDialog
        raffleId={raffleId}
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
        defaultPosition={nextPosition}
      />

      <AssignWinnerDialog
        prize={assignTarget}
        open={Boolean(assignTarget)}
        onOpenChange={(open) => !open && setAssignTarget(null)}
      />

      <PublishWinnerDialog
        prize={publishTarget}
        open={Boolean(publishTarget)}
        onOpenChange={(open) => !open && setPublishTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(confirmDelete)}
        onOpenChange={(open) => !open && setConfirmDelete(null)}
        title="¿Eliminar premio?"
        description={
          confirmDelete
            ? `«${confirmDelete.title}» se eliminará del sorteo.`
            : undefined
        }
        confirmLabel="Eliminar"
        destructive
        isLoading={remove.isPending}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

interface CardProps {
  prize: PrizeEntity;
  onEdit: () => void;
  onDelete: () => void;
  onAssign: () => void;
  onPublish: () => void;
}

function PrizeCard({
  prize,
  onEdit,
  onDelete,
  onAssign,
  onPublish,
}: CardProps) {
  const clear = useClearPrizeWinner(prize.id);

  const handleClear = async () => {
    try {
      await clear.mutateAsync();
      toast.success("Ganador retirado");
    } catch (error) {
      toast.error("No se pudo quitar", extractErrorMessage(error));
    }
  };

  return (
    <li>
      <Card>
        <CardContent className="space-y-4 pt-5">
          <div className="flex items-start gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-lg border border-border bg-surface-strong">
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
              {prize.description ? (
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {prize.description}
                </p>
              ) : null}
              <div className="mt-1.5">
                <PrizeStatusBadge prize={prize} />
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Acciones">
                  <MoreHorizontal className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    onEdit();
                  }}
                >
                  <Pencil className="size-4" /> Editar premio
                </DropdownMenuItem>
                {prize.winner && !prize.winnerPublished ? (
                  <DropdownMenuItem
                    onSelect={(e) => {
                      e.preventDefault();
                      void handleClear();
                    }}
                  >
                    <RotateCcw className="size-4" /> Quitar ganador
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    onDelete();
                  }}
                  disabled={prize.winnerPublished}
                >
                  <Trash2 className="size-4" /> Eliminar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {prize.winner ? (
            <div className="rounded-lg border border-border bg-surface/40 p-3 text-xs">
              <div className="mb-1.5 flex items-center gap-1.5 font-medium text-primary">
                <Crown className="size-3" />
                Ganador asignado
              </div>
              <div className="grid gap-x-3 gap-y-1 sm:grid-cols-2">
                <p>
                  <span className="text-muted-foreground">Ticket:</span>{" "}
                  <span className="font-mono">
                    #{prize.winner.ticketNumber.toString().padStart(5, "0")}
                  </span>
                </p>
                <p className="truncate">
                  <span className="text-muted-foreground">Nombre:</span>{" "}
                  {prize.winner.fullName}
                </p>
                <p className="truncate">
                  <span className="text-muted-foreground">Email:</span>{" "}
                  {prize.winner.email}
                </p>
                <p>
                  <span className="text-muted-foreground">DNI:</span>{" "}
                  {prize.winner.dni ?? "—"}
                </p>
              </div>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
            <Button size="sm" variant="outline" onClick={onAssign}>
              <Sparkles className="size-3.5" />
              {prize.winner ? "Cambiar ganador" : "Asignar ganador"}
            </Button>
            <Button
              size="sm"
              onClick={onPublish}
              disabled={!prize.winner}
            >
              <Send className="size-3.5" />
              {prize.winnerPublished ? "Editar publicación" : "Publicar"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </li>
  );
}
