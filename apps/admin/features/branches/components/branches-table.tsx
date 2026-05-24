"use client";

import { useState } from "react";
import { MapPin, MoreHorizontal, Pencil, Phone, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { useDeleteBranch } from "../hooks/use-branches";
import type { BranchEntity } from "../types";
import type { PaginationMeta } from "@/types/api";

interface Props {
  data: BranchEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  onEdit: (branch: BranchEntity) => void;
}

export function BranchesTable({
  data,
  isLoading,
  meta,
  onPageChange,
  onEdit,
}: Props) {
  const deleteMutation = useDeleteBranch();
  const [deleteTarget, setDeleteTarget] = useState<BranchEntity | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Sucursal eliminada");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("No se pudo eliminar", extractErrorMessage(error));
    }
  };

  const columns: DataTableColumn<BranchEntity>[] = [
    {
      key: "name",
      header: "Sucursal",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{row.name}</span>
          <span className="truncate text-xs text-muted-foreground">
            /{row.slug}
          </span>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contacto",
      cell: (row) => (
        <div className="space-y-0.5 text-xs">
          {row.address ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <MapPin className="size-3 shrink-0" />
              <span className="truncate">{row.address}</span>
            </div>
          ) : null}
          {row.phone ? (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Phone className="size-3 shrink-0" />
              <span>{row.phone}</span>
            </div>
          ) : null}
          {!row.address && !row.phone ? (
            <span className="text-muted-foreground">—</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "products",
      header: "Productos",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => row.productsTracked,
    },
    {
      key: "active",
      header: "Estado",
      cell: (row) =>
        row.active ? (
          <Badge variant="success">Activa</Badge>
        ) : (
          <Badge variant="muted">Inactiva</Badge>
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
                onEdit(row);
              }}
            >
              <Pencil className="size-4" /> Editar
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
      <DataTable<BranchEntity>
        data={data}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => onEdit(row)}
        emptyTitle="Aún no hay sucursales"
        emptyDescription="Crea la primera sucursal para empezar a gestionar inventario por ubicación."
        meta={meta}
        onPageChange={onPageChange}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="¿Eliminar sucursal?"
        description={
          deleteTarget
            ? `«${deleteTarget.name}» y su inventario asociado se eliminarán. Esta acción no se puede deshacer.`
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
