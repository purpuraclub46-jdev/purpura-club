"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { FormField } from "@/shared/ui/form-field";
import { Input } from "@/shared/ui/input";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { useResetUserPassword } from "../hooks/use-users";
import type { UserEntity } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserEntity | null;
}

export function ResetPasswordDialog({ open, onOpenChange, user }: Props) {
  const reset = useResetUserPassword();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setConfirm("");
      setError(null);
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!user) return;
    if (password.length < 8) {
      setError("Mínimo 8 caracteres");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }
    setError(null);
    try {
      await reset.mutateAsync({ id: user.id, payload: { password } });
      toast.success("Contraseña actualizada");
      onOpenChange(false);
    } catch (e) {
      toast.error("No se pudo restablecer", extractErrorMessage(e));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Restablecer contraseña</DialogTitle>
          <DialogDescription>
            {user
              ? `Se asignará una nueva contraseña a ${user.firstName} ${user.lastName} (${user.email}). La sesión actual del usuario se cerrará automáticamente.`
              : ""}
          </DialogDescription>
        </DialogHeader>

        <FormField label="Nueva contraseña" required error={error ?? undefined}>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="•••••••••"
            autoComplete="new-password"
          />
        </FormField>

        <FormField label="Confirmar contraseña" required>
          <Input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="•••••••••"
            autoComplete="new-password"
          />
        </FormField>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={reset.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={reset.isPending}
          >
            Restablecer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
