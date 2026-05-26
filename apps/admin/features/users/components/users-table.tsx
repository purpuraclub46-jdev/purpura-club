"use client";

import { KeyRound, MoreHorizontal, Pencil, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { formatDate } from "@/shared/lib/format";
import type { PaginationMeta } from "@/types/api";
import type { UserEntity } from "../types";
import { UserStatusBadge } from "./user-status-badge";

interface Props {
  data: UserEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  onEdit: (user: UserEntity) => void;
  onToggleActive: (user: UserEntity) => void;
  onResetPassword: (user: UserEntity) => void;
  onDelete: (user: UserEntity) => void;
  currentUserId?: string;
}

export function UsersTable({
  data,
  isLoading,
  meta,
  onPageChange,
  onEdit,
  onToggleActive,
  onResetPassword,
  onDelete,
  currentUserId,
}: Props) {
  const columns: DataTableColumn<UserEntity>[] = [
    {
      key: "user",
      header: "Usuario",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            {row.firstName} {row.lastName}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {row.email}
          </span>
          {row.dni ? (
            <span className="truncate text-[10px] text-muted-foreground">
              DNI: {row.dni}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      cell: (row) =>
        row.roles.length === 0 ? (
          <span className="text-xs text-muted-foreground">Sin roles</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {row.roles.map((r) => (
              <Badge
                key={r.id}
                variant={r.slug === "super_admin" ? "default" : "outline"}
                className="text-[10px]"
              >
                {r.name}
              </Badge>
            ))}
          </div>
        ),
    },
    {
      key: "location",
      header: "Sucursal",
      cell: (row) =>
        row.location ? (
          <span className="text-sm">{row.location.name}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Sin restricción</span>
        ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <UserStatusBadge active={row.active} />,
    },
    {
      key: "lastLoginAt",
      header: "Último ingreso",
      cell: (row) =>
        row.lastLoginAt ? (
          <span className="text-xs">{formatDate(row.lastLoginAt)}</span>
        ) : (
          <span className="text-xs text-muted-foreground">Nunca</span>
        ),
    },
    {
      key: "actions",
      header: "",
      headClassName: "text-right",
      className: "text-right",
      cell: (row) => {
        const isSelf = row.id === currentUserId;
        return (
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
              <DropdownMenuItem onSelect={() => onResetPassword(row)}>
                <KeyRound className="size-4" /> Restablecer contraseña
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => onToggleActive(row)}
                disabled={isSelf && row.active}
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
                disabled={isSelf}
              >
                <Trash2 className="size-4" /> Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <DataTable<UserEntity>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      emptyTitle="Aún no hay usuarios"
      emptyDescription="Crea el primer usuario para empezar a operar el panel."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
