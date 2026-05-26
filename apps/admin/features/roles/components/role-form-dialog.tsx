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
import { Switch } from "@/shared/ui/switch";
import { Textarea } from "@/shared/ui/textarea";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import {
  useCreateRole,
  usePermissions,
  useUpdateRole,
} from "../hooks/use-rbac";
import type { RoleEntity } from "../types";
import { PermissionsMatrix } from "./permissions-matrix";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: RoleEntity | null;
}

interface FormState {
  name: string;
  slug: string;
  description: string;
  active: boolean;
  permissionKeys: string[];
}

const EMPTY: FormState = {
  name: "",
  slug: "",
  description: "",
  active: true,
  permissionKeys: [],
};

export function RoleFormDialog({ open, onOpenChange, initial }: Props) {
  const isEdit = Boolean(initial);
  const create = useCreateRole();
  const update = useUpdateRole(initial?.id ?? "");
  const { data: permissions } = usePermissions();

  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        slug: initial.slug,
        description: initial.description ?? "",
        active: initial.active,
        permissionKeys: initial.permissionKeys,
      });
    } else {
      setForm(EMPTY);
    }
    setErrors({});
  }, [open, initial]);

  const isLoading = create.isPending || update.isPending;

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Nombre es obligatorio";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        description: form.description.trim() || undefined,
        active: form.active,
        permissionKeys: form.permissionKeys,
      };

      if (isEdit && initial) {
        await update.mutateAsync(payload);
        toast.success("Rol actualizado");
      } else {
        await create.mutateAsync(payload);
        toast.success("Rol creado");
      }
      onOpenChange(false);
    } catch (e) {
      toast.error(
        isEdit ? "No se pudo actualizar el rol" : "No se pudo crear el rol",
        extractErrorMessage(e),
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar rol" : "Crear nuevo rol"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos del rol y reasigna sus permisos."
              : "Define un rol personalizado con un subconjunto específico de permisos."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Nombre"
            htmlFor="role-name"
            required
            error={errors.name}
          >
            <Input
              id="role-name"
              value={form.name}
              onChange={(e) =>
                setForm((p) => ({ ...p, name: e.target.value }))
              }
              placeholder="Supervisor de Tienda"
              disabled={isEdit && initial?.isOfficial}
            />
          </FormField>
          <FormField
            label="Slug"
            htmlFor="role-slug"
            description={
              isEdit && initial?.isOfficial
                ? "Los roles oficiales no permiten cambiar el slug."
                : "Snake case. Si se omite, se deriva del nombre."
            }
          >
            <Input
              id="role-slug"
              value={form.slug}
              onChange={(e) =>
                setForm((p) => ({ ...p, slug: e.target.value }))
              }
              placeholder="supervisor_tienda"
              disabled={isEdit && initial?.isOfficial}
            />
          </FormField>

          <FormField
            label="Descripción"
            htmlFor="role-description"
            className="md:col-span-2"
          >
            <Textarea
              id="role-description"
              value={form.description}
              onChange={(e) =>
                setForm((p) => ({ ...p, description: e.target.value }))
              }
              placeholder="Define el alcance del rol y sus responsabilidades."
              rows={2}
            />
          </FormField>
        </div>

        <div className="flex items-center justify-between rounded-md border border-border-strong bg-surface/40 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Rol activo</p>
            <p className="text-xs text-muted-foreground">
              Los roles inactivos no se asignan a usuarios nuevos ni se evalúan en la autorización.
            </p>
          </div>
          <Switch
            checked={form.active}
            onCheckedChange={(checked) =>
              setForm((p) => ({ ...p, active: checked }))
            }
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-medium">Permisos asignados</p>
              <p className="text-xs text-muted-foreground">
                {form.permissionKeys.length} permisos seleccionados.
              </p>
            </div>
          </div>
          <PermissionsMatrix
            permissions={permissions ?? []}
            selectedKeys={form.permissionKeys}
            onChange={(keys) =>
              setForm((p) => ({ ...p, permissionKeys: keys }))
            }
          />
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            isLoading={isLoading}
          >
            {isEdit ? "Guardar cambios" : "Crear rol"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
