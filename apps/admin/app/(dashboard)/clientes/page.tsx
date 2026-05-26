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
import { CustomerFormDialog } from "@/features/customers/components/customer-form-dialog";
import { CustomersFilters } from "@/features/customers/components/customers-filters";
import { CustomersStats } from "@/features/customers/components/customers-stats";
import { CustomersTable } from "@/features/customers/components/customers-table";
import {
  useCustomersList,
  useCustomersOverview,
  useDeleteCustomer,
  useSetCustomerActive,
} from "@/features/customers/hooks/use-customers";
import type {
  CustomerEntity,
  CustomerListQuery,
} from "@/features/customers/types";

export default function ClientesPage() {
  const { user } = useAuth();
  const canDelete = user?.role === "SUPER_ADMIN";

  const [query, setQuery] = useState<CustomerListQuery>({
    page: 1,
    limit: 25,
  });
  const { data, isLoading } = useCustomersList(query);
  const { data: overview, isLoading: isLoadingOverview } =
    useCustomersOverview();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerEntity | null>(null);
  const [toggleTarget, setToggleTarget] = useState<CustomerEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CustomerEntity | null>(null);

  const setActive = useSetCustomerActive();
  const remove = useDeleteCustomer();

  const handleCreate = () => {
    setEditing(null);
    setFormOpen(true);
  };

  const handleEdit = (c: CustomerEntity) => {
    setEditing(c);
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
        toggleTarget.active ? "Cliente desactivado" : "Cliente activado",
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
      toast.success("Cliente eliminado");
    } catch (e) {
      toast.error("No se pudo eliminar", extractErrorMessage(e));
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Clientes"
        description="CRM de Purpura Club. Centraliza contactos, membresía, sorteos y compras — base del POS y de las campañas futuras."
        actions={
          <Button onClick={handleCreate}>
            <Plus className="size-4" /> Nuevo cliente
          </Button>
        }
      />

      <CustomersStats data={overview} isLoading={isLoadingOverview} />

      <Card>
        <CardContent className="space-y-4 pt-6">
          <CustomersFilters query={query} onChange={setQuery} />
          <CustomersTable
            data={data?.items ?? []}
            isLoading={isLoading}
            meta={data?.meta}
            onPageChange={(page) => setQuery((q) => ({ ...q, page }))}
            onEdit={handleEdit}
            onToggleActive={setToggleTarget}
            onDelete={setDeleteTarget}
            canDelete={canDelete}
          />
        </CardContent>
      </Card>

      <CustomerFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        initial={editing}
      />

      <ConfirmDialog
        open={Boolean(toggleTarget)}
        onOpenChange={(o) => !o && setToggleTarget(null)}
        title={
          toggleTarget?.active ? "¿Desactivar cliente?" : "¿Activar cliente?"
        }
        description={
          toggleTarget
            ? toggleTarget.active
              ? `«${toggleTarget.fullName}» dejará de aparecer en sugerencias del POS.`
              : `«${toggleTarget.fullName}» volverá a estar disponible para operaciones.`
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
        title="¿Eliminar cliente?"
        description={
          deleteTarget
            ? `«${deleteTarget.fullName}» se eliminará de forma permanente. Esta acción no se puede deshacer.`
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
