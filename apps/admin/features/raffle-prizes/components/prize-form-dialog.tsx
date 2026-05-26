"use client";

import { useEffect, useState } from "react";
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
import { Textarea } from "@/shared/ui/textarea";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import {
  useCreatePrize,
  useUpdatePrize,
} from "../hooks/use-prizes";
import type { PrizeEntity } from "../types";

interface Props {
  raffleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: PrizeEntity | null;
  /** Posición sugerida cuando se crea un nuevo premio. */
  defaultPosition?: number;
}

export function PrizeFormDialog({
  raffleId,
  open,
  onOpenChange,
  initial,
  defaultPosition,
}: Props) {
  const isEdit = Boolean(initial);
  const create = useCreatePrize(raffleId);
  const update = useUpdatePrize(initial?.id ?? "");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [position, setPosition] = useState<number>(1);

  useEffect(() => {
    if (!open) return;
    setTitle(initial?.title ?? "");
    setDescription(initial?.description ?? "");
    setImage(initial?.image ?? "");
    setPosition(initial?.position ?? defaultPosition ?? 1);
  }, [open, initial, defaultPosition]);

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error("Título requerido");
      return;
    }
    const payload = {
      title: title.trim(),
      description: description.trim() || undefined,
      image: image.trim() || undefined,
      position,
    };
    try {
      if (isEdit && initial) {
        await update.mutateAsync(payload);
        toast.success("Premio actualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Premio creado");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error("No se pudo guardar", extractErrorMessage(error));
    }
  };

  const isPending = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar premio" : "Nuevo premio"}
          </DialogTitle>
          <DialogDescription>
            Cada sorteo puede tener varios premios. La posición define el orden
            (1° = primer premio).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-[1fr_120px]">
            <FormField label="Título" required>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="iPhone 16 Pro Max"
              />
            </FormField>
            <FormField label="Posición" required>
              <Input
                type="number"
                min={1}
                value={position}
                onChange={(e) =>
                  setPosition(Number(e.target.value) || 1)
                }
              />
            </FormField>
          </div>

          <FormField
            label="URL de imagen"
            description="Imagen del premio (opcional, mostrada en la landing)."
          >
            <Input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://…"
            />
          </FormField>

          <FormField label="Descripción">
            <Textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalle del premio, especificaciones, color…"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            isLoading={isPending}
          >
            {isEdit ? "Guardar cambios" : "Crear premio"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
