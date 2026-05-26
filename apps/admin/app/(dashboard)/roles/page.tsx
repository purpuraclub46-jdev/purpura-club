"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PageHeader } from "@/shared/ui/page-header";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { RoleFormDialog } from "@/features/roles/components/role-form-dialog";
import { RolesTable } from "@/features/roles/components/roles-table";
import {
  useDeleteRole,
  useRolesList,
  useUpdateRole,
} from "@/features/roles/hooks/use-rbac";
import type { RoleEntity, RoleListQuery } from "@/features/roles/types";

export default function RolesPage() {
  const [query, setQuery] = useState<RoleListQuery>({ page: 1, limit: 50 });
  const { data, isLoading } = useRolesList(query);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<RoleEntity | null>(null);
  const [toggleTarget, setToggleTarget] = useState<RoleEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleEntity | null>(null);

  // El hook update espera el id en el constructor → se instancia con el actual.
  const toggleMutation = useUpdateRole(toggleTarget?.id ?? "");
  const remove = useDeleteRole();

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (role: RoleEntity) => {
    setEditing(role);
    setFormOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    try {
      await toggleMutation.mutateAsync({ active: !toggleTarget.active });
      toast.success(
        toggleTarget.active ? "Rol desactivado" : "Rol activado",
      );
    } catch (e) {
      toast.error("No se pudo actualizar", extractErrorMessage(e));
    } finally {
      setToggleTarget(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast.success("Rol eliminado");
    } catch (e) {
      toast.error("No se pudo eliminar", extractErrorMessage(e));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Roles"
        description="Define qué puede hacer cada perfil. Los roles oficiales del sistema se mantienen sincronizados en cada arranque del API."
        actions={
          <Button onClick={handleCreate}>
            <Plus className="size-4" /> Nuevo rol
          </Button>
        }
      />

      <Card>
        <CardContent className="pt-6">
          <RolesTable
            data={data?.items ?? []}
            isLoading={isLoading}
            meta={data?.meta}
            onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
            onEdit={handleEdit}
            onToggleActive={setToggleTarget}
            onDelete={setDeleteTarget}
          />
        </CardContent>
      </Card>

      <RoleFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
      />

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={
          toggleTarget?.active ? "¿Desactivar rol?" : "¿Activar rol?"
        }
        description={
          toggleTarget
            ? toggleTarget.active
              ? `«${toggleTarget.name}» dejará de evaluarse en la autorización de los usuarios asignados.`
              : `«${toggleTarget.name}» volverá a otorgar sus permisos a los usuarios asignados.`
            : ""
        }
        confirmLabel={toggleTarget?.active ? "Desactivar" : "Activar"}
        destructive={Boolean(toggleTarget?.active)}
        isLoading={toggleMutation.isPending}
        onConfirm={() => void handleConfirmToggle()}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="¿Eliminar rol?"
        description={
          deleteTarget
            ? `El rol «${deleteTarget.name}» se eliminará de forma permanente. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        destructive
        isLoading={remove.isPending}
        onConfirm={() => void handleConfirmDelete()}
      />
    </>
  );
}
