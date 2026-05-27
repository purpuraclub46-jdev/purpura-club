"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { FormField } from "@/shared/ui/form-field";
import { Textarea } from "@/shared/ui/textarea";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { useUpdateComplaint } from "@/features/complaints/hooks/use-complaints";
import {
  COMPLAINT_DOCUMENT_LABEL,
  COMPLAINT_STATUS_LABEL,
  COMPLAINT_SUBJECT_LABEL,
  COMPLAINT_TYPE_LABEL,
  type ComplaintEntity,
  type ComplaintStatus,
} from "@/types/api";
import { cn } from "@/shared/lib/cn";

interface ComplaintDetailDialogProps {
  complaint: ComplaintEntity | null;
  onOpenChange: (open: boolean) => void;
}

/**
 * Dialog de detalle del reclamo. Muestra todos los datos del consumidor y
 * permite cambiar estado + escribir respuesta oficial + notas internas.
 *
 * Datos del consumidor son inmutables (intencional — el Libro de
 * Reclamaciones preserva el registro original tal como fue presentado).
 *
 * Estados → flujo: PENDIENTE → EN_REVISION → RESUELTO (con reapertura
 * posible). El service marca `resolvedAt` automáticamente al primer cambio
 * a RESUELTO y lo limpia si se reabre.
 */
export function ComplaintDetailDialog({
  complaint,
  onOpenChange,
}: ComplaintDetailDialogProps) {
  // Hook con id estable — cuando el complaint cambia, el form se reinicializa
  // vía useEffect abajo.
  const mutation = useUpdateComplaint(complaint?.id ?? "");

  const [status, setStatus] = useState<ComplaintStatus>("PENDIENTE");
  const [response, setResponse] = useState("");
  const [internalNotes, setInternalNotes] = useState("");

  useEffect(() => {
    if (!complaint) return;
    setStatus(complaint.status);
    setResponse(complaint.response ?? "");
    setInternalNotes(complaint.internalNotes ?? "");
  }, [complaint]);

  if (!complaint) {
    return (
      <Dialog open={false} onOpenChange={onOpenChange}>
        <DialogContent />
      </Dialog>
    );
  }

  const handleSave = async () => {
    try {
      await mutation.mutateAsync({
        status,
        response: response.trim() || undefined,
        internalNotes: internalNotes.trim() || undefined,
      });
      toast.success("Reclamo actualizado");
      onOpenChange(false);
    } catch (error) {
      toast.error("No se pudo guardar", extractErrorMessage(error));
    }
  };

  return (
    <Dialog open={Boolean(complaint)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>
              <span className="font-mono text-sm font-semibold tabular-nums">
                {complaint.ticketNumber}
              </span>
            </DialogTitle>
            <StatusBadge status={complaint.status} />
          </div>
          <DialogDescription>
            Recibido el {formatDate(complaint.createdAt)} ·{" "}
            {COMPLAINT_TYPE_LABEL[complaint.type]} ·{" "}
            {COMPLAINT_SUBJECT_LABEL[complaint.subjectType]}
          </DialogDescription>
        </DialogHeader>

        <div className="grid max-h-[60vh] gap-5 overflow-y-auto pr-1">
          {/* Consumidor */}
          <Section title="Consumidor">
            <Grid>
              <Field label="Nombre">
                {complaint.firstName} {complaint.lastName}
              </Field>
              <Field label="Documento">
                {COMPLAINT_DOCUMENT_LABEL[complaint.documentType]} ·{" "}
                {complaint.documentNumber}
              </Field>
              <Field label="Teléfono">{complaint.phone}</Field>
              <Field label="Correo">{complaint.email}</Field>
              <Field label="Dirección" wide>
                {complaint.address}
              </Field>
              {complaint.isMinor ? (
                <>
                  <Field label="Tutor">{complaint.guardianFullName}</Field>
                  <Field label="Doc. tutor">{complaint.guardianDocument}</Field>
                </>
              ) : null}
            </Grid>
          </Section>

          {/* Asunto */}
          <Section title="Asunto">
            <Grid>
              <Field label="Producto / servicio" wide>
                {complaint.subjectDetail}
              </Field>
              {complaint.amount !== null ? (
                <Field label="Monto">
                  {formatCurrency(complaint.amount)}
                </Field>
              ) : null}
            </Grid>
          </Section>

          {/* Detalle */}
          <Section title="Detalle del reclamo">
            <p className="whitespace-pre-wrap text-sm text-foreground/80">
              {complaint.description}
            </p>
          </Section>

          <Section title="Pedido del consumidor">
            <p className="whitespace-pre-wrap text-sm text-foreground/80">
              {complaint.consumerRequest}
            </p>
          </Section>

          {/* Trazabilidad */}
          {complaint.resolvedAt ? (
            <Section title="Resolución">
              <p className="text-xs text-muted-foreground">
                Resuelto el {formatDate(complaint.resolvedAt)}
              </p>
            </Section>
          ) : null}

          {/* Form admin */}
          <div className="space-y-4 rounded-lg border border-border bg-surface-muted p-4">
            <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Gestión interna
            </h4>

            <FormField label="Estado" htmlFor="status">
              <select
                id="status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as ComplaintStatus)
                }
                className="h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/15"
              >
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_REVISION">En revisión</option>
                <option value="RESUELTO">Resuelto</option>
              </select>
            </FormField>

            <FormField
              label="Respuesta oficial"
              htmlFor="response"
              description="Texto que se comparte con el consumidor."
            >
              <Textarea
                id="response"
                rows={5}
                value={response}
                onChange={(e) => setResponse(e.target.value)}
                placeholder="Estimado consumidor, en respuesta a su reclamo…"
              />
            </FormField>

            <FormField
              label="Notas internas"
              htmlFor="internalNotes"
              description="Solo visibles para el equipo de atención."
            >
              <Textarea
                id="internalNotes"
                rows={3}
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                placeholder="Notas para el equipo (no se envían al consumidor)…"
              />
            </FormField>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button onClick={handleSave} isLoading={mutation.isPending}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Primitives ───────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {title}
      </h4>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">{children}</div>
  );
}

function Field({
  label,
  children,
  wide,
}: {
  label: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className={cn("space-y-0.5", wide && "sm:col-span-2")}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className="text-sm text-foreground/85">{children}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: ComplaintStatus }) {
  const variant =
    status === "RESUELTO"
      ? "success"
      : status === "EN_REVISION"
        ? "warning"
        : "muted";
  return <Badge variant={variant}>{COMPLAINT_STATUS_LABEL[status]}</Badge>;
}
