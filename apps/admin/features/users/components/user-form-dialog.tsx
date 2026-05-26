"use client";

import { useEffect, useMemo, useState } from "react";
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
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { useLocationsList } from "@/features/locations/hooks/use-locations";
import { useRolesList } from "@/features/roles/hooks/use-rbac";
import { useCreateUser, useUpdateUser } from "../hooks/use-users";
import type { UserEntity } from "../types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initial?: UserEntity | null;
}

interface FormState {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  dni: string;
  inventoryLocationId: string | "";
  roleIds: string[];
  active: boolean;
}

const EMPTY_FORM: FormState = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  dni: "",
  inventoryLocationId: "",
  roleIds: [],
  active: true,
};

export function UserFormDialog({ open, onOpenChange, initial }: Props) {
  const isEdit = Boolean(initial);
  const create = useCreateUser();
  const update = useUpdateUser(initial?.id ?? "");
  const { data: locationsPage } = useLocationsList({ limit: 100 });
  const { data: rolesPage } = useRolesList({ limit: 100, active: true });

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        email: initial.email,
        password: "",
        firstName: initial.firstName,
        lastName: initial.lastName,
        dni: initial.dni ?? "",
        inventoryLocationId: initial.location?.id ?? "",
        roleIds: initial.roles.map((r) => r.id),
        active: initial.active,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, initial]);

  const locations = locationsPage?.items ?? [];
  const roles = rolesPage?.items ?? [];

  const isLoading = create.isPending || update.isPending;

  const toggleRole = (roleId: string) => {
    setForm((prev) =>
      prev.roleIds.includes(roleId)
        ? { ...prev, roleIds: prev.roleIds.filter((id) => id !== roleId) }
        : { ...prev, roleIds: [...prev.roleIds, roleId] },
    );
  };

  const validate = (): boolean => {
    const next: Record<string, string> = {};
    if (!form.email.trim()) next.email = "Email es obligatorio";
    if (!form.firstName.trim()) next.firstName = "Nombre es obligatorio";
    if (!form.lastName.trim()) next.lastName = "Apellido es obligatorio";
    if (!isEdit && !form.password.trim()) {
      next.password = "Contraseña es obligatoria";
    } else if (!isEdit && form.password.length < 8) {
      next.password = "Mínimo 8 caracteres";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    try {
      const payload = {
        email: form.email.trim().toLowerCase(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        dni: form.dni.trim() || undefined,
        inventoryLocationId: form.inventoryLocationId || null,
        roleIds: form.roleIds,
        active: form.active,
      };

      if (isEdit && initial) {
        await update.mutateAsync(payload);
        toast.success("Usuario actualizado");
      } else {
        await create.mutateAsync({ ...payload, password: form.password });
        toast.success("Usuario creado");
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(
        isEdit ? "No se pudo actualizar el usuario" : "No se pudo crear el usuario",
        extractErrorMessage(error),
      );
    }
  };

  const dialogTitle = isEdit ? "Editar usuario" : "Crear nuevo usuario";

  const sortedRoles = useMemo(
    () => [...roles].sort((a, b) => a.name.localeCompare(b.name)),
    [roles],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Actualiza los datos, la sucursal asignada y los roles del usuario."
              : "Completa los datos básicos. La contraseña debe contener mayúscula, minúscula, número y símbolo."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <FormField
            label="Nombre"
            htmlFor="user-firstName"
            required
            error={errors.firstName}
          >
            <Input
              id="user-firstName"
              value={form.firstName}
              onChange={(e) =>
                setForm((p) => ({ ...p, firstName: e.target.value }))
              }
              placeholder="María"
              autoComplete="off"
            />
          </FormField>
          <FormField
            label="Apellido"
            htmlFor="user-lastName"
            required
            error={errors.lastName}
          >
            <Input
              id="user-lastName"
              value={form.lastName}
              onChange={(e) =>
                setForm((p) => ({ ...p, lastName: e.target.value }))
              }
              placeholder="Pérez"
              autoComplete="off"
            />
          </FormField>

          <FormField
            label="Email"
            htmlFor="user-email"
            required
            error={errors.email}
            className="md:col-span-2"
          >
            <Input
              id="user-email"
              type="email"
              value={form.email}
              onChange={(e) =>
                setForm((p) => ({ ...p, email: e.target.value }))
              }
              placeholder="asesora.ica@purpura.club"
              autoComplete="off"
            />
          </FormField>

          {!isEdit ? (
            <FormField
              label="Contraseña"
              htmlFor="user-password"
              required
              error={errors.password}
              description="Mín. 8 caracteres con mayúscula, minúscula, número y símbolo."
              className="md:col-span-2"
            >
              <Input
                id="user-password"
                type="password"
                value={form.password}
                onChange={(e) =>
                  setForm((p) => ({ ...p, password: e.target.value }))
                }
                autoComplete="new-password"
              />
            </FormField>
          ) : null}

          <FormField label="DNI / Documento" htmlFor="user-dni">
            <Input
              id="user-dni"
              value={form.dni}
              onChange={(e) =>
                setForm((p) => ({ ...p, dni: e.target.value }))
              }
              placeholder="70123456"
              autoComplete="off"
            />
          </FormField>

          <FormField label="Sucursal asignada" htmlFor="user-location">
            <select
              id="user-location"
              value={form.inventoryLocationId}
              onChange={(e) =>
                setForm((p) => ({
                  ...p,
                  inventoryLocationId: e.target.value,
                }))
              }
              className="flex h-10 w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-sm"
            >
              <option value="">Sin restricción (todas)</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </FormField>
        </div>

        <FormField
          label="Roles asignados"
          description="Selecciona uno o más roles. Los permisos efectivos se suman."
        >
          <div className="space-y-2 rounded-md border border-border-strong bg-surface/40 p-3">
            {sortedRoles.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Cargando roles disponibles…
              </p>
            ) : (
              sortedRoles.map((role) => {
                const checked = form.roleIds.includes(role.id);
                return (
                  <label
                    key={role.id}
                    className="flex cursor-pointer items-start gap-3 rounded-md p-2 hover:bg-surface-strong"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(role.id)}
                      className="mt-0.5 size-4 accent-primary"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{role.name}</span>
                        <code className="rounded bg-muted/30 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {role.slug}
                        </code>
                        {role.isOfficial ? (
                          <span className="text-[10px] uppercase tracking-wider text-primary">
                            Oficial
                          </span>
                        ) : null}
                      </div>
                      {role.description ? (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {role.description}
                        </p>
                      ) : null}
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </FormField>

        <div className="flex items-center justify-between rounded-md border border-border-strong bg-surface/40 px-3 py-2">
          <div>
            <p className="text-sm font-medium">Cuenta activa</p>
            <p className="text-xs text-muted-foreground">
              Desactivar bloquea el login y cierra las sesiones existentes.
            </p>
          </div>
          <Switch
            checked={form.active}
            onCheckedChange={(checked) =>
              setForm((p) => ({ ...p, active: checked }))
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
            {isEdit ? "Guardar cambios" : "Crear usuario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
