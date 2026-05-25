"use client";

import { useState } from "react";
import { ImageOff, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
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
import { useDeleteCategory } from "../hooks/use-categories";
import type { CategoryEntity } from "../types";
import { CategoryGroupBadge } from "./category-group-badge";
import type { PaginationMeta } from "@/types/api";

interface Props {
  data: CategoryEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  onEdit: (category: CategoryEntity) => void;
}

export function CategoriesTable({
  data,
  isLoading,
  meta,
  onPageChange,
  onEdit,
}: Props) {
  const deleteMutation = useDeleteCategory();
  const [deleteTarget, setDeleteTarget] = useState<CategoryEntity | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Categoría eliminada");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("No se pudo eliminar", extractErrorMessage(error));
    }
  };

  const columns: DataTableColumn<CategoryEntity>[] = [
    {
      key: "name",
      header: "Categoría",
      cell: (row) => (
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-md border border-border bg-surface-strong">
            {row.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.image}
                alt={row.name}
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground">
                <ImageOff className="size-4" />
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-col">
            <div className="flex min-w-0 items-center gap-1.5">
              {row.parent ? (
                <span className="truncate text-xs text-muted-foreground">
                  {row.parent.name} ›
                </span>
              ) : null}
              <span className="truncate font-medium">{row.name}</span>
            </div>
            <span className="truncate text-xs text-muted-foreground">
              /{row.slug}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: "group",
      header: "Grupo",
      cell: (row) => <CategoryGroupBadge group={row.group} />,
    },
    {
      key: "children",
      header: "Hijas",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) =>
        row.childrenCount > 0 ? (
          row.childrenCount
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: "products",
      header: "Productos",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => row.productsCount,
    },
    {
      key: "order",
      header: "Orden",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => row.order,
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
      <DataTable<CategoryEntity>
        data={data}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => onEdit(row)}
        emptyTitle="Aún no hay categorías"
        emptyDescription="Crea la primera categoría para empezar a organizar tu catálogo."
        meta={meta}
        onPageChange={onPageChange}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="¿Eliminar categoría?"
        description={
          deleteTarget
            ? `«${deleteTarget.name}» se desvinculará de ${deleteTarget.productsCount} producto(s). Esta acción no se puede deshacer.`
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
