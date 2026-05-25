"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ImageOff,
  MapPin,
  MoreHorizontal,
  Pencil,
  Sparkles,
  Trash2,
} from "lucide-react";
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
import { formatCurrency } from "@/shared/lib/format";
import { computePricing } from "@/shared/lib/pricing";
import { toast } from "@/stores/toast.store";
import { useDeleteProduct } from "../hooks/use-products";
import type { ProductEntity } from "../types";
import type { PaginationMeta } from "@/types/api";

interface Props {
  data: ProductEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function ProductsTable({ data, isLoading, meta, onPageChange }: Props) {
  const router = useRouter();
  const deleteMutation = useDeleteProduct();
  const [deleteTarget, setDeleteTarget] = useState<ProductEntity | null>(null);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      toast.success("Producto eliminado");
      setDeleteTarget(null);
    } catch (error) {
      toast.error("No se pudo eliminar", extractErrorMessage(error));
    }
  };

  const columns: DataTableColumn<ProductEntity>[] = [
    {
      key: "name",
      header: "Producto",
      cell: (row) => {
        const cover = row.images[0]?.url;
        return (
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative size-12 shrink-0 overflow-hidden rounded-md border border-border bg-surface-strong">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={cover}
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
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate font-medium">{row.name}</span>
                {row.featured ? (
                  <Sparkles className="size-3 shrink-0 text-primary" />
                ) : null}
              </div>
              <span className="truncate text-xs text-muted-foreground">
                SKU {row.sku}
              </span>
            </div>
          </div>
        );
      },
    },
    {
      key: "price",
      header: "Precio normal",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <span className="font-medium">{formatCurrency(row.price)}</span>
      ),
    },
    {
      key: "discountPercentage",
      header: "Oferta %",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) =>
        row.discountPercentage !== null && row.discountPercentage > 0 ? (
          <span className="font-medium text-primary">
            -{row.discountPercentage}%
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "salePrice",
      header: "Precio oferta",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) =>
        row.discountActive && row.salePrice !== null ? (
          <span className="font-semibold text-primary">
            {formatCurrency(row.salePrice)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "memberPrice",
      header: "Precio miembro",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => {
        // En la tabla admin queremos siempre ver el precio miembro hipotético,
        // independiente de quién esté logueado.
        const memberPreview = computePricing(
          {
            price: row.price,
            discountPercentage: row.discountPercentage,
            discountActive: row.discountActive,
            discountStartsAt: row.discountStartsAt,
            discountEndsAt: row.discountEndsAt,
          },
          { isMember: true },
        );
        return memberPreview.memberPrice !== null ? (
          <span className="text-xs font-medium">
            {formatCurrency(memberPreview.memberPrice)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      key: "discountActive",
      header: "Oferta activa",
      cell: (row) =>
        row.discountActive ? (
          <Badge variant="default">
            <Sparkles className="size-3" /> Vigente
          </Badge>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "availability",
      header: "Disponibilidad",
      cell: (row) => {
        const enabled = row.availability.filter((a) => a.active);
        if (enabled.length === 0) {
          return (
            <span className="text-xs text-muted-foreground">
              Sin ubicaciones
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-1">
            {enabled.slice(0, 2).map((a) => (
              <Badge
                key={a.inventoryLocationId}
                variant="outline"
                className="max-w-35"
              >
                <MapPin className="size-3 shrink-0" />
                <span className="truncate">{a.locationName}</span>
              </Badge>
            ))}
            {enabled.length > 2 ? (
              <Badge variant="muted">+{enabled.length - 2}</Badge>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "inventory",
      header: "Stock",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <div className="flex flex-col text-xs">
          <span>{row.inventory.totalStock.toLocaleString("es-PE")}</span>
          {row.inventory.totalReserved > 0 ? (
            <span className="text-muted-foreground">
              {row.inventory.totalReserved.toLocaleString("es-PE")} reservados
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "active",
      header: "Estado",
      cell: (row) =>
        row.active ? (
          <Badge variant="success">Activo</Badge>
        ) : (
          <Badge variant="muted">Inactivo</Badge>
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
                router.push(`/productos/${row.id}`);
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
      <DataTable<ProductEntity>
        data={data}
        columns={columns}
        isLoading={isLoading}
        rowKey={(row) => row.id}
        onRowClick={(row) => router.push(`/productos/${row.id}`)}
        emptyTitle="Aún no hay productos"
        emptyDescription="Crea tu primer producto para comenzar a vender."
        meta={meta}
        onPageChange={onPageChange}
      />
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="¿Eliminar producto?"
        description={
          deleteTarget
            ? `«${deleteTarget.name}» se eliminará junto con sus imágenes, variantes y stock asociado. Esta acción no se puede deshacer.`
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
