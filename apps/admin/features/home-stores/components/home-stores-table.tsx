"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff, ImageOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { EmptyState } from "@/shared/ui/empty-state";
import { toast } from "@/stores/toast.store";
import { extractErrorMessage } from "@/services/http/client";
import { useDeleteHomeStore } from "../hooks/use-home-stores";
import type { HomeStoreEntity } from "../types";

interface HomeStoresTableProps {
  data: HomeStoreEntity[];
  isLoading: boolean;
}

export function HomeStoresTable({ data, isLoading }: HomeStoresTableProps) {
  const deleteMutation = useDeleteHomeStore();
  const [deleteTarget, setDeleteTarget] = useState<HomeStoreEntity | null>(
    null,
  );

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Tienda eliminada");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("No se pudo eliminar", extractErrorMessage(error));
    }
  };

  const columns: DataTableColumn<HomeStoreEntity>[] = [
    {
      key: "thumb",
      header: "",
      headClassName: "w-14",
      className: "w-14",
      cell: (row) => <Thumb store={row} />,
    },
    {
      key: "name",
      header: "Tienda",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/tiendas-home/${row.id}`}
            className="truncate font-medium hover:text-primary"
          >
            {row.name}
          </Link>
          <span className="truncate text-xs text-muted-foreground">
            {row.city} · {row.address}
          </span>
        </div>
      ),
    },
    {
      key: "schedule",
      header: "Horario",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">
          {row.schedule ?? "—"}
        </span>
      ),
    },
    {
      key: "active",
      header: "Estado",
      headClassName: "w-36",
      className: "w-36",
      cell: (row) =>
        row.active ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-emerald-700">
            <Eye className="size-3" /> Visible
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#1111110a] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            <EyeOff className="size-3" /> Oculta
          </span>
        ),
    },
    {
      key: "sortOrder",
      header: "Orden",
      headClassName: "w-20",
      className: "w-20",
      cell: (row) => (
        <span className="font-mono text-xs tabular-nums text-muted-foreground">
          {row.sortOrder}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headClassName: "w-12",
      className: "w-12",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Acciones de ${row.name}`}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/tiendas-home/${row.id}`}>
                <Pencil className="size-4" />
                Editar
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(row)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="size-4" />
              Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (!isLoading && data.length === 0) {
    return (
      <EmptyState
        title="Sin tiendas configuradas"
        description="Crea la primera tienda para que aparezca en el carrusel del home."
        action={
          <Button asChild>
            <Link href="/tiendas-home/nueva">Nueva tienda</Link>
          </Button>
        }
      />
    );
  }

  return (
    <>
      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        rowKey={(row) => row.id}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Eliminar tienda"
        description={
          deleteTarget
            ? `Vas a eliminar "${deleteTarget.name}" (${deleteTarget.city}). Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </>
  );
}

function Thumb({ store }: { store: HomeStoreEntity }) {
  const src = store.imageDesktop ?? store.imageMobile;
  return (
    <div className="size-10 overflow-hidden rounded-md bg-muted ring-1 ring-black/5">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <div className="flex size-full items-center justify-center text-muted-foreground/40">
          <ImageOff className="size-4" strokeWidth={1.5} />
        </div>
      )}
    </div>
  );
}
