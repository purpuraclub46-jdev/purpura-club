"use client";

import Link from "next/link";
import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PageHeader } from "@/shared/ui/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { formatDate } from "@/shared/lib/format";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { LocationTypeBadge } from "@/features/locations/components/location-type-badge";
import { TransferStatusBadge } from "@/features/transfers/components/transfer-status-badge";
import {
  useCancelTransfer,
  useCompleteTransfer,
  useTransfer,
} from "@/features/transfers/hooks/use-transfers";

export function TransferDetailView({ id }: { id: string }) {
  const { data: transfer, isLoading, isError } = useTransfer(id);
  const complete = useCompleteTransfer();
  const cancel = useCancelTransfer();
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !transfer) {
    return (
      <div className="space-y-4">
        <Button asChild variant="ghost" size="sm">
          <Link href="/transferencias">
            <ArrowLeft className="size-4" /> Volver a transferencias
          </Link>
        </Button>
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Transferencia no encontrada.
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPending = transfer.status === "PENDING";

  const handleComplete = async () => {
    try {
      await complete.mutateAsync(transfer.id);
      toast.success("Transferencia completada");
      setConfirmComplete(false);
    } catch (error) {
      toast.error("No se pudo completar", extractErrorMessage(error));
    }
  };

  const handleCancel = async () => {
    try {
      await cancel.mutateAsync(transfer.id);
      toast.success("Transferencia cancelada");
      setConfirmCancel(false);
    } catch (error) {
      toast.error("No se pudo cancelar", extractErrorMessage(error));
    }
  };

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2 w-fit">
        <Link href="/transferencias">
          <ArrowLeft className="size-4" /> Volver a transferencias
        </Link>
      </Button>

      <PageHeader
        title={`Transferencia ${transfer.number}`}
        description={
          <span className="inline-flex flex-wrap items-center gap-2">
            <TransferStatusBadge status={transfer.status} />
            <span className="text-xs text-muted-foreground">
              Creada el {formatDate(transfer.createdAt)}
              {transfer.createdByUserName
                ? ` por ${transfer.createdByUserName}`
                : ""}
            </span>
          </span>
        }
        actions={
          isPending ? (
            <>
              <Button
                variant="outline"
                onClick={() => setConfirmCancel(true)}
              >
                <Ban className="size-4" /> Cancelar
              </Button>
              <Button onClick={() => setConfirmComplete(true)}>
                <CheckCircle2 className="size-4" /> Completar
              </Button>
            </>
          ) : null
        }
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>Productos</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfer.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex min-w-0 flex-col">
                        <span className="truncate font-medium">
                          {item.productName}
                        </span>
                        <span className="truncate text-xs text-muted-foreground">
                          SKU {item.productSku}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {item.quantity.toLocaleString("es-PE")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ruta</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Desde
                </p>
                <p className="font-medium">{transfer.fromLocation.name}</p>
                <LocationTypeBadge type={transfer.fromLocation.type} />
              </div>
              <div className="flex justify-center text-muted-foreground">
                <ArrowRight className="size-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs uppercase tracking-wider text-muted-foreground">
                  Hacia
                </p>
                <p className="font-medium">{transfer.toLocation.name}</p>
                <LocationTypeBadge type={transfer.toLocation.type} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Ítems</span>
                <span className="tabular-nums font-medium">
                  {transfer.items.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Unidades</span>
                <span className="tabular-nums font-medium">
                  {transfer.totalQuantity.toLocaleString("es-PE")}
                </span>
              </div>
              {transfer.completedAt ? (
                <div className="flex items-center justify-between border-t border-border pt-2">
                  <span className="text-muted-foreground">Completada</span>
                  <span className="text-xs">
                    {formatDate(transfer.completedAt)}
                  </span>
                </div>
              ) : null}
              {transfer.notes ? (
                <div className="border-t border-border pt-2">
                  <p className="text-xs text-muted-foreground">Notas</p>
                  <p>{transfer.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirmComplete}
        onOpenChange={setConfirmComplete}
        title="¿Completar transferencia?"
        description="Se descontará el stock en la ubicación origen y se agregará en la destino. Esta acción no se puede deshacer."
        confirmLabel="Completar"
        isLoading={complete.isPending}
        onConfirm={() => void handleComplete()}
      />

      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        title="¿Cancelar transferencia?"
        description="La transferencia quedará marcada como cancelada y ya no podrá completarse."
        confirmLabel="Cancelar transferencia"
        destructive
        isLoading={cancel.isPending}
        onConfirm={() => void handleCancel()}
      />
    </>
  );
}
