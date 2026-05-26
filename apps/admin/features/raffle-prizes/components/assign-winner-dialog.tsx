"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Search,
  Ticket as TicketIcon,
  UserCheck,
} from "lucide-react";
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
import { Input } from "@/shared/ui/input";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { useAssignPrizeWinner } from "../hooks/use-prizes";
import type { PrizeEntity } from "../types";

interface Props {
  prize: PrizeEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Wizard de 2 pasos:
 *  1. Admin ingresa el ticket exportado del Excel.
 *  2. El backend valida + devuelve los datos del usuario para confirmación
 *     visual ANTES de marcar al ganador como definitivo.
 *
 * Aquí ambos pasos se condensan en un POST a /assign-winner que ya devuelve
 * el objeto con `winner` poblado. Mostramos el resumen para que el admin
 * confirme visualmente antes de cerrar el diálogo.
 */
export function AssignWinnerDialog({ prize, open, onOpenChange }: Props) {
  const assign = useAssignPrizeWinner(prize?.id ?? "");
  const [ticketInput, setTicketInput] = useState("");
  const [validated, setValidated] = useState<PrizeEntity | null>(null);

  useEffect(() => {
    if (!open) {
      setTicketInput("");
      setValidated(null);
    } else if (prize?.winner) {
      setValidated(prize);
      setTicketInput(String(prize.winner.ticketNumber));
    }
  }, [open, prize]);

  if (!prize) return null;

  const handleValidate = async () => {
    const parsed = Number(ticketInput.replace(/\D/g, ""));
    if (!parsed || parsed <= 0) {
      toast.error("Ingresa un número de ticket válido");
      return;
    }
    try {
      const updated = await assign.mutateAsync({ ticketNumber: parsed });
      setValidated(updated);
      toast.success("Ticket validado", "Revisa los datos antes de publicar.");
    } catch (error) {
      setValidated(null);
      toast.error("Validación fallida", extractErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Asignar ganador — {prize.title}</DialogTitle>
          <DialogDescription>
            Ingresa el número de ticket ganador obtenido del sorteo manual
            (Excel exportado). El sistema validará que exista, esté pagado y
            no haya sido asignado a otro premio.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            label="Número de ticket"
            description="Solo el número, sin almohadilla. Ejemplo: 231"
          >
            <div className="relative">
              <TicketIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 font-mono text-lg tracking-wider"
                placeholder="231"
                value={ticketInput}
                onChange={(e) => {
                  setTicketInput(e.target.value);
                  setValidated(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleValidate();
                  }
                }}
              />
            </div>
          </FormField>

          <Button
            type="button"
            variant="outline"
            onClick={() => void handleValidate()}
            isLoading={assign.isPending}
          >
            <Search className="size-4" /> Validar ticket
          </Button>

          {validated?.winner ? (
            <div className="space-y-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                <CheckCircle2 className="size-4" />
                Ticket válido — revisa los datos del ganador
              </div>
              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <KV label="Ticket">
                  <span className="font-mono">
                    #{validated.winner.ticketNumber.toString().padStart(5, "0")}
                  </span>
                </KV>
                <KV label="Nombre">{validated.winner.fullName}</KV>
                <KV label="Email">{validated.winner.email}</KV>
                <KV label="DNI">
                  {validated.winner.dni ?? (
                    <span className="text-amber-500">No registrado</span>
                  )}
                </KV>
              </div>
              <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <UserCheck className="size-3" />
                El ganador queda asignado al premio. Para hacerlo público, usa
                "Publicar ganador oficial".
              </p>
            </div>
          ) : null}

          {!validated && ticketInput && !assign.isPending ? (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="size-3" />
              Aún no validado. Pulsa "Validar ticket".
            </p>
          ) : null}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={assign.isPending}
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function KV({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="font-medium">{children}</p>
    </div>
  );
}
