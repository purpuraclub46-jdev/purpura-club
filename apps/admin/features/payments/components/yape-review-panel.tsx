"use client";

import { useState } from "react";
import { Check, FileImage, X } from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { extractErrorMessage } from "@/services/http/client";
import { formatDate } from "@/shared/lib/format";
import { toast } from "@/stores/toast.store";
import { EntryStatusBadge } from "@/features/raffle-entries/components/entry-status-badge";
import { useDecidePayment, useYapePayments } from "../hooks/use-payments";
import type { PaymentRow } from "../types";

export function YapeReviewPanel() {
  const { data, isLoading } = useYapePayments({
    page: 1,
    limit: 50,
    status: "PENDING_PAYMENT",
  });
  const decide = useDecidePayment();
  const [decision, setDecision] = useState<{
    entry: PaymentRow;
    type: "approve" | "reject";
  } | null>(null);

  const onConfirm = async () => {
    if (!decision) return;
    try {
      await decide.mutateAsync({
        entryId: decision.entry.id,
        decision: decision.type,
      });
      toast.success(
        decision.type === "approve" ? "Pago aprobado" : "Pago rechazado",
      );
      setDecision(null);
    } catch (error) {
      toast.error(
        "Acción no disponible",
        `${extractErrorMessage(error)} — endpoint del backend pendiente.`,
      );
    }
  };

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
      key: "status",
      header: "Estado",
      cell: (row) => <EntryStatusBadge status={row.status} />,
    },
    {
      key: "voucher",
      header: "Voucher",
      cell: () => (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
          <FileImage className="size-3.5" />
          Pendiente de subir
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      headClassName: "text-right w-44",
      className: "text-right",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDecision({ entry: row, type: "reject" })}
          >
            <X className="size-3.5" /> Rechazar
          </Button>
          <Button
            size="sm"
            variant="success"
            onClick={() => setDecision({ entry: row, type: "approve" })}
          >
            <Check className="size-3.5" /> Aprobar
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Yape — pagos manuales de tickets de sorteos</CardTitle>
        <CardDescription>
          Canal exclusivo para tickets de sorteos. Cada participación queda{" "}
          <em>pendiente</em> hasta que un administrador valide el voucher
          subido por el participante. Yape <strong>no</strong> se usa para el
          ecommerce.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <DataTable<PaymentRow>
          data={data?.items ?? []}
          columns={columns}
          isLoading={isLoading}
          rowKey={(row) => row.id}
          emptyTitle="No hay pagos Yape pendientes"
          emptyDescription="Todo en orden — no hay revisiones manuales pendientes."
        />
      </CardContent>

      <ConfirmDialog
        open={Boolean(decision)}
        onOpenChange={(open) => !open && setDecision(null)}
        title={
          decision?.type === "approve"
            ? "¿Aprobar pago Yape?"
            : "¿Rechazar pago Yape?"
        }
        description={
          decision
            ? decision.type === "approve"
              ? `Marcar el ticket #${decision.entry.ticketNumber} como pagado y confirmar la participación.`
              : `Marcar el ticket #${decision.entry.ticketNumber} como cancelado. El cliente deberá reintentar.`
            : undefined
        }
        confirmLabel={decision?.type === "approve" ? "Aprobar" : "Rechazar"}
        destructive={decision?.type === "reject"}
        isLoading={decide.isPending}
        onConfirm={() => void onConfirm()}
      />
    </Card>
  );
}
