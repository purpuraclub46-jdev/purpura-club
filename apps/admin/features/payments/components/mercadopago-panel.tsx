"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { formatDate } from "@/shared/lib/format";
import { EntryStatusBadge } from "@/features/raffle-entries/components/entry-status-badge";
import { useMercadoPagoPayments } from "../hooks/use-payments";
import type { PaymentRow } from "../types";

export function MercadoPagoPanel() {
  const { data, isLoading } = useMercadoPagoPayments({
    page: 1,
    limit: 50,
  });

  const columns: DataTableColumn<PaymentRow>[] = [
    {
      key: "ticket",
      header: "Ticket",
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-mono text-xs">
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
        <div className="flex flex-col">
          <span className="font-medium">{row.raffle?.title ?? "—"}</span>
          <span className="text-xs text-muted-foreground">
            {row.user
              ? `${row.user.firstName} ${row.user.lastName}`.trim()
              : "—"}
          </span>
        </div>
      ),
    },
    {
      key: "reference",
      header: "Referencia",
      cell: (row) => (
        <span className="font-mono text-xs text-muted-foreground">
          {row.paymentReference ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Estado",
      cell: (row) => <EntryStatusBadge status={row.status} />,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>MercadoPago — automatizado</CardTitle>
        <CardDescription>
          El estado de pago aquí se actualiza automáticamente por los webhooks
          de MercadoPago. El ecommerce usa este canal; las participaciones
          quedan registradas para auditoría.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable<PaymentRow>
          data={data?.items ?? []}
          columns={columns}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          emptyTitle="Sin actividad de MercadoPago"
          emptyDescription="Aún no se han procesado participaciones vía MercadoPago."
        />
      </CardContent>
    </Card>
  );
}
