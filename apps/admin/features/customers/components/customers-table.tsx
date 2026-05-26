"use client";

import Link from "next/link";
import {
  ExternalLink,
  MoreHorizontal,
  Pencil,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import type { PaginationMeta } from "@/types/api";
import type { CustomerEntity } from "../types";
import {
  CustomerStatusBadge,
  MembershipBadge,
} from "./customer-status-badge";

interface Props {
  data: CustomerEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
  onEdit: (customer: CustomerEntity) => void;
  onToggleActive: (customer: CustomerEntity) => void;
  onDelete: (customer: CustomerEntity) => void;
  canDelete?: boolean;
}

export function CustomersTable({
  data,
  isLoading,
  meta,
  onPageChange,
  onEdit,
  onToggleActive,
  onDelete,
  canDelete = false,
}: Props) {
  const columns: DataTableColumn<CustomerEntity>[] = [
    {
      key: "customer",
      header: "Cliente",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <Link
            href={`/clientes/${row.id}`}
            className="truncate font-medium hover:text-primary"
          >
            {row.fullName}
          </Link>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {row.phone ? <span>{row.phone}</span> : null}
            {row.email ? <span>· {row.email}</span> : null}
          </div>
          {row.dni ? (
            <span className="truncate text-[10px] text-muted-foreground">
              DNI: {row.dni}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "membership",
      header: "Membresía",
      cell: (row) => (
        <MembershipBadge
          isMember={row.isMember}
          expiresAt={row.membershipExpiresAt}
        />
      ),
    },
    {
      key: "totalSpent",
      header: "Total gastado",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => (
        <span className="font-medium">
          {row.stats.totalSpent > 0
            ? formatCurrency(row.stats.totalSpent)
            : "—"}
        </span>
      ),
    },
    {
      key: "paidOrders",
      header: "Compras",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => row.stats.paidOrders,
    },
    {
      key: "raffleEntries",
      header: "Tickets",
      headClassName: "text-right",
      className: "text-right tabular-nums",
      cell: (row) => row.stats.raffleEntries,
    },
    {
      key: "lastPurchaseAt",
      header: "Última compra",
      cell: (row) =>
        row.stats.lastPurchaseAt ? (
          <span className="text-xs">
            {formatDate(row.stats.lastPurchaseAt)}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <CustomerStatusBadge active={row.active} />,
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
            <DropdownMenuItem asChild>
              <Link href={`/clientes/${row.id}`}>
                <ExternalLink className="size-4" /> Ver detalle
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onEdit(row)}>
              <Pencil className="size-4" /> Editar
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onToggleActive(row)}>
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
            {canDelete ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={() => onDelete(row)}
                >
                  <Trash2 className="size-4" /> Eliminar
                </DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <DataTable<CustomerEntity>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      emptyTitle="Sin clientes registrados"
      emptyDescription="Crea el primer cliente para empezar a construir la base CRM."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
