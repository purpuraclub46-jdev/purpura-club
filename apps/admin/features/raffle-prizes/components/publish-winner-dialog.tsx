"use client";

import { useEffect, useState } from "react";
import { Send } from "lucide-react";
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
import { usePublishPrizeWinner } from "../hooks/use-prizes";
import type { PrizeEntity } from "../types";

interface Props {
  prize: PrizeEntity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PublishWinnerDialog({ prize, open, onOpenChange }: Props) {
  const publish = usePublishPrizeWinner(prize?.id ?? "");
  const [photo, setPhoto] = useState("");
  const [video, setVideo] = useState("");
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!open) return;
    setPhoto(prize?.winnerPhoto ?? "");
    setVideo(prize?.winnerVideo ?? "");
    setAnnouncement(prize?.winnerAnnouncement ?? "");
  }, [open, prize]);

  if (!prize) return null;

  if (!prize.winner) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Publicar ganador</DialogTitle>
            <DialogDescription>
              Primero debes asignar un ganador con el número de ticket antes
              de publicar.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const handleSubmit = async () => {
    try {
      await publish.mutateAsync({
        winnerPhoto: photo.trim() || undefined,
        winnerVideo: video.trim() || undefined,
        winnerAnnouncement: announcement.trim() || undefined,
      });
      toast.success("Ganador publicado");
      onOpenChange(false);
    } catch (error) {
      toast.error("No se pudo publicar", extractErrorMessage(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar ganador oficial — {prize.title}</DialogTitle>
          <DialogDescription>
            Quedará visible en la landing pública y en el panel de usuarios.
            Ganador: <strong>{prize.winner.fullName}</strong> (ticket{" "}
            <span className="font-mono">
              #{prize.winner.ticketNumber.toString().padStart(5, "0")}
            </span>
            ).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <FormField
            label="URL de foto"
            description="Foto del ganador o la entrega (opcional)."
          >
            <Input
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
              placeholder="https://…/foto-entrega.jpg"
            />
          </FormField>

          <FormField
            label="URL de video"
            description="Video de la entrega o anuncio (opcional)."
          >
            <Input
              value={video}
              onChange={(e) => setVideo(e.target.value)}
              placeholder="https://…/video.mp4"
            />
          </FormField>

          <FormField
            label="Comunicado / descripción"
            description="Texto público que acompaña al anuncio (opcional)."
          >
            <Textarea
              rows={5}
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value)}
              placeholder="¡Felicidades a nuestro ganador!…"
            />
          </FormField>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={publish.isPending}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            isLoading={publish.isPending}
          >
            <Send className="size-4" />
            {prize.winnerPublished
              ? "Actualizar publicación"
              : "Publicar oficial"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
