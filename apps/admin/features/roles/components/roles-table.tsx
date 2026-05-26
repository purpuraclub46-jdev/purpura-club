"use client";

import { MoreHorizontal, Pencil, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import type { PaginationMeta } from "@/types/api";
import type { RoleEntity } from "../types";
import { RoleStatusBadge } from "./role-status-badge";

interface Props {
  data: RoleEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  onEdit: (role: RoleEntity) => void;
  onToggleActive: (role: RoleEntity) => void;
  onDelete: (role: RoleEntity) => void;
}

export function RolesTable({
  data,
  isLoading,
  meta,
  onPageChange,
  onEdit,
  onToggleActive,
  onDelete,
}: Props) {
  const columns: DataTableColumn<RoleEntity>[] = [
    {
      key: "name",
      header: "Rol",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">{row.name}</span>
          <code className="truncate text-[10px] text-muted-foreground">
            {row.slug}
          </code>
        </div>
      ),
    },
    {
      key: "description",
      header: "Descripción",
      cell: (row) =>
        row.description ? (
          <span className="line-clamp-2 text-xs">{row.description}</span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "permissions",
      header: "Permisos",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <span className="font-medium">{row.permissionKeys.length}</span>
      ),
    },
    {
      key: "users",
      header: "Usuarios",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => <span>{row.usersCount}</span>,
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => (
        <RoleStatusBadge active={row.active} isOfficial={row.isOfficial} />
      ),
    },
    {
      key: "actions",
      header: "",
      headClassName: "text-right",
      className: "text-right",
      cell: (row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Acciones">
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onEdit(row)}>
              <Pencil className="size-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => onToggleActive(row)}
              disabled={row.isOfficial && row.slug === "super_admin"}
            >
              {row.active ? (
                <>
                  <ShieldOff className="size-4" /> Desactivar
                </>
              ) : (
                <>
                  <ShieldCheck className="size-4" /> Activar
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => onDelete(row)}
              disabled={row.isOfficial || row.usersCount > 0}
            >
              <Trash2 className="size-4" /> Eliminar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable<RoleEntity>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      emptyTitle="Sin roles definidos"
      emptyDescription="Crea un rol personalizado para asignar permisos específicos."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
