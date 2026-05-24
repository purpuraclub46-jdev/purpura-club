"use client";

import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { formatDate } from "@/shared/lib/format";
import {
  EntryStatusBadge,
  EntryTypeBadge,
  PaymentMethodBadge,
} from "./entry-status-badge";
import type { RaffleEntryEntity } from "@/features/raffle-entries/types";
import type { PaginationMeta } from "@/types/api";

interface EntriesTableProps {
  data: RaffleEntryEntity[];
  isLoading: boolean;
  meta?: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function EntriesTable({
  data,
  isLoading,
  meta,
  onPageChange,
}: EntriesTableProps) {
  const columns: DataTableColumn<RaffleEntryEntity>[] = [
    {
      key: "ticket",
      header: "Ticket",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-sm text-foreground">
            #{row.ticketNumber.toString().padStart(5, "0")}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatDate(row.createdAt)}
          </span>
        </div>
      ),
    },
    {
      key: "raffle",
      header: "Sorteo",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          {row.raffle ? (
            <Link
              href={`/sorteos/${row.raffleId}`}
              className="truncate font-medium hover:text-primary"
            >
              {row.raffle.title}
            </Link>
          ) : (
            <span className="truncate text-muted-foreground">—</span>
          )}
          <span className="truncate text-xs text-muted-foreground">
            /{row.raffle?.slug ?? row.raffleId.slice(0, 8)}
          </span>
        </div>
      ),
    },
    {
      key: "user",
      header: "Participante",
      cell: (row) => (
        <div className="flex min-w-0 flex-col">
          <span className="truncate font-medium">
            {row.user
              ? `${row.user.firstName} ${row.user.lastName}`.trim()
              : "—"}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {row.user?.email ?? "—"}
          </span>
        </div>
      ),
    },
    {
      key: "type",
      header: "Origen",
      cell: (row) => <EntryTypeBadge type={row.type} />,
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <EntryStatusBadge status={row.status} />,
    },
    {
      key: "method",
      header: "Método",
      cell: (row) => <PaymentMethodBadge method={row.paymentMethod} />,
    },
  ];

  return (
    <DataTable<RaffleEntryEntity>
      data={data}
      columns={columns}
      isLoading={isLoading}
      rowKey={(row) => row.id}
      emptyTitle="No hay participaciones"
      emptyDescription="Cuando los participantes adquieran tickets aparecerán aquí."
      meta={meta}
      onPageChange={onPageChange}
    />
  );
}
