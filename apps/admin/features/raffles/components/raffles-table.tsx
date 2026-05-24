"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { MoreHorizontal, Pencil, Send, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { toast } from "@/stores/toast.store";
import { extractErrorMessage } from "@/services/http/client";
import {
  RaffleStatusBadge,
  RaffleVisibilityBadge,
} from "./raffle-status-badge";
import {
  useDeleteRaffle,
  usePublishRaffle,
} from "@/features/raffles/hooks/use-raffle-mutations";
import type { RaffleEntity } from "@/features/raffles/types";
import type { PaginationMeta } from "@/types/api";

interface RafflesTableProps {
  data: RaffleEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function RafflesTable({
  data,
  isLoading,
  meta,
  onPageChange,
}: RafflesTableProps) {
  const router = useRouter();
  const deleteMutation = useDeleteRaffle();
  const publishMutation = usePublishRaffle();

  const [deleteTarget, setDeleteTarget] = useState<RaffleEntity | null>(null);

  const handlePublish = async (raffle: RaffleEntity) => {
    try {
      await publishMutation.mutateAsync(raffle.id);
      toast.success("Sorteo publicado");
    } catch (error) {
      toast.error("No se pudo publicar", extractErrorMessage(error));
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Sorteo eliminado");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("No se pudo eliminar", extractErrorMessage(error));
    }
  };

  const columns: DataTableColumn<RaffleEntity>[] = [
    {
      key: "title",
      header: "Sorteo",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/sorteos/${row.id}`}
            className="truncate font-medium hover:text-primary"
          >
            {row.title}
          </Link>
          <span className="truncate text-xs text-muted-foreground">
            /{row.slug}
          </span>
        </div>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <div className="flex items-center gap-1.5">
          <RaffleStatusBadge status={row.status} />
          <RaffleVisibilityBadge visibility={row.visibility} />
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Cuándo",
      cell: (row) => (
        <div className="flex flex-col text-xs">
          <span className="text-foreground">{formatDate(row.startDate)}</span>
          <span className="text-muted-foreground">
            hasta {formatDate(row.endDate)}
          </span>
        </div>
      ),
    },
    {
      key: "price",
      header: "Precio",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <div className="flex flex-col text-xs">
          <span>{formatCurrency(row.ticketPrice)}</span>
          <span className="text-muted-foreground">
            Miembro {formatCurrency(row.memberTicketPrice)}
          </span>
        </div>
      ),
    },
    {
      key: "tickets",
      header: "Tickets",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <div className="flex flex-col text-xs">
          <span>
            {row.soldTickets.toLocaleString("es-PE")} /{" "}
            {row.totalTickets.toLocaleString("es-PE")}
          </span>
          <span className="text-muted-foreground">
            {row.remainingTickets.toLocaleString("es-PE")} disponibles
          </span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      headClassName: "w-12",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              aria-label="Más acciones"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                router.push(`/sorteos/${row.id}`);
              }}
            >
              <Pencil className="size-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={
                row.status === "PUBLISHED" || row.status === "CANCELLED"
              }
              onSelect={(e) => {
                e.preventDefault();
                void handlePublish(row);
              }}
            >
              <Send className="size-4" /> Publicar
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                setDeleteTarget(row);
              }}
            >
              <Trash2 className="size-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <>
      <DataTable<RaffleEntity>
        data={data}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/sorteos/${row.id}`)}
        emptyTitle="Aún no hay sorteos"
        emptyDescription="Crea tu primer sorteo para comenzar."
        meta={meta}
        onPageChange={onPageChange}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="¿Eliminar sorteo?"
        description={
          deleteTarget
            ? `«${deleteTarget.title}» se eliminará junto con todas sus participaciones. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar"
        destructive
        isLoading={deleteMutation.isPending}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
