"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent } from "@/shared/ui/card";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { PageHeader } from "@/shared/ui/page-header";
import { extractErrorMessage } from "@/services/http/client";
import { toast } from "@/stores/toast.store";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ResetPasswordDialog } from "@/features/users/components/reset-password-dialog";
import { UserFormDialog } from "@/features/users/components/user-form-dialog";
import { UsersFilters } from "@/features/users/components/users-filters";
import { UsersTable } from "@/features/users/components/users-table";
import {
  useDeleteUser,
  useSetUserActive,
  useUsersList,
} from "@/features/users/hooks/use-users";
import type { UserEntity, UserListQuery } from "@/features/users/types";

export default function UsuariosPage() {
  const { user: currentUser } = useAuth();
  const [query, setQuery] = useState<UserListQuery>({ page: 1, limit: 25 });
  const { data, isLoading } = useUsersList(query);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<UserEntity | null>(null);
  const [resetTarget, setResetTarget] = useState<UserEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserEntity | null>(null);
  const [toggleTarget, setToggleTarget] = useState<UserEntity | null>(null);

  const setActive = useSetUserActive();
  const remove = useDeleteUser();

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (user: UserEntity) => {
    setEditing(user);
    setFormOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (!toggleTarget) return;
    try {
      await setActive.mutateAsync({
        id: toggleTarget.id,
        active: !toggleTarget.active,
      });
      toast.success(
        toggleTarget.active ? "Usuario desactivado" : "Usuario activado",
      );
    } catch (error) {
      toast.error("No se pudo actualizar", extractErrorMessage(error));
    } finally {
      setToggleTarget(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      toast.success("Usuario eliminado");
    } catch (error) {
      toast.error("No se pudo eliminar", extractErrorMessage(error));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Usuarios"
        description="Gestiona cuentas, sucursales asignadas y roles. Los permisos se resuelven automáticamente desde los roles asignados."
        actions={
          <Button onClick={handleCreate}>
            <Plus className="size-4" /> Nuevo usuario
          </Button>
        }
      />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <UsersFilters query={query} onChange={setQuery} />
          <UsersTable
            data={data?.items ?? []}
            isLoading={isLoading}
            meta={data?.meta}
            onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
            onEdit={handleEdit}
            onToggleActive={setToggleTarget}
            onResetPassword={setResetTarget}
            onDelete={setDeleteTarget}
            currentUserId={currentUser?.id}
          />
        </CardContent>
      </Card>

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
      />

      <ResetPasswordDialog
        open={Boolean(resetTarget)}
        onOpenChange={(o) => !o && setResetTarget(null)}
        user={resetTarget}
      />

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={
          toggleTarget?.active
            ? "¿Desactivar usuario?"
            : "¿Activar usuario?"
        }
        description={
          toggleTarget
            ? toggleTarget.active
              ? `«${toggleTarget.firstName} ${toggleTarget.lastName}» no podrá iniciar sesión y sus sesiones activas se cerrarán.`
              : `«${toggleTarget.firstName} ${toggleTarget.lastName}» podrá iniciar sesión nuevamente.`
            : ""
        }
        confirmLabel={toggleTarget?.active ? "Desactivar" : "Activar"}
        destructive={Boolean(toggleTarget?.active)}
        isLoading={setActive.isPending}
        onConfirm={() => void handleConfirmToggle()}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="¿Eliminar usuario?"
        description={
          deleteTarget
            ? `«${deleteTarget.firstName} ${deleteTarget.lastName}» (${deleteTarget.email}) se eliminará de forma permanente. Esta acción no se puede deshacer.`
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
